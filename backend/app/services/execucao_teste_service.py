import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.repositories.execucao_teste_repository import ExecucaoTesteRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.execucao_teste import ExecucaoPassoUpdate
from app.models.testing import (
    StatusExecucaoEnum, StatusPassoEnum, 
    StatusCicloEnum, CicloTeste
)
from app.core.errors import tratar_erro_integridade

logger = logging.getLogger(__name__)

class ExecucaoTesteService:
    def __init__(self, db: AsyncSession):
        self.repo = ExecucaoTesteRepository(db)
        self.user_repo = UsuarioRepository(db)

    # --- HELPERS ---
    async def _atualizar_ciclo_para_execucao(self, ciclo_id: int):
        ciclo = await self.repo.db.get(CicloTeste, ciclo_id)
        if ciclo and ciclo.status == StatusCicloEnum.planejado:
            logger.info(f"AUTO-UPDATE: Ciclo {ciclo_id} mudou para EM_EXECUCAO.")
            await self.repo.update_ciclo(ciclo_id, {"status": StatusCicloEnum.em_execucao})

    async def _verificar_conclusao_ciclo(self, ciclo_id: int):
        tem_pendencia = await self.repo.verificar_pendencias_ciclo(ciclo_id)
        if not tem_pendencia:
            logger.info(f"AUTO-UPDATE: Ciclo {ciclo_id} concluído automaticamente.")
            await self.repo.update_ciclo(ciclo_id, {"status": StatusCicloEnum.concluido})

    async def _validar_usuario_ativo(self, usuario_id: int):
        if not usuario_id: return
        user = await self.user_repo.get_usuario_by_id(usuario_id)
        if not user or not user.ativo:
            raise HTTPException(status_code=400, detail="O utilizador selecionado está INATIVO.")

    # --- ACTIONS ---
    async def alocar_teste(self, ciclo_id: int, caso_id: int, responsavel_id: int):
        await self._validar_usuario_ativo(responsavel_id)
        
        try:
            nova_execucao = await self.repo.criar_planejamento_execucao(ciclo_id, caso_id, responsavel_id)
            await self._atualizar_ciclo_para_execucao(ciclo_id)
            return nova_execucao
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e, {
                "unique_constraint": "Este caso já está alocado neste ciclo."
            })

    async def listar_tarefas_usuario(self, usuario_id: int):
        return await self.repo.get_minhas_execucoes(usuario_id)

    async def registrar_resultado_passo(self, execucao_passo_id: int, dados: ExecucaoPassoUpdate):
        passo_atualizado = await self.repo.update_execucao_passo(execucao_passo_id, dados)
        
        if not passo_atualizado:
            raise HTTPException(status_code=404, detail="Passo de execução não encontrado")

        status_novo = None
        if dados.status == StatusPassoEnum.reprovado:
            status_novo = StatusExecucaoEnum.falhou
        elif dados.status == StatusPassoEnum.bloqueado:
            status_novo = StatusExecucaoEnum.bloqueado
            
        if status_novo:
            await self.repo.update_status_geral_execucao(
                passo_atualizado.execucao_teste_id, 
                status_novo
            )
            execucao = await self.repo.get_execucao_by_id(passo_atualizado.execucao_teste_id)
            if execucao:
                await self._verificar_conclusao_ciclo(execucao.ciclo_teste_id)
            
        return passo_atualizado

    async def finalizar_execucao(self, execucao_id: int, status: StatusExecucaoEnum):
        execucao = await self.repo.update_status_geral_execucao(execucao_id, status)
        if execucao:
            await self._verificar_conclusao_ciclo(execucao.ciclo_teste_id)
        return execucao