from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Sequence, Optional

from app.models.testing import (
    ExecucaoTeste, ExecucaoPasso, PassoCasoTeste, 
    CasoTeste, StatusExecucaoEnum
)
from app.models.usuario import Usuario 
from app.schemas.execucao_teste import ExecucaoPassoUpdate

class ExecucaoTesteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def verificar_pendencias_ciclo(self, ciclo_id: int) -> bool:
        query = select(ExecucaoTeste).where(
            ExecucaoTeste.ciclo_teste_id == ciclo_id,
            ExecucaoTeste.status_geral.in_([StatusExecucaoEnum.pendente, StatusExecucaoEnum.em_progresso])
        )
        result = await self.db.execute(query)
        return result.scalars().first() is not None

    async def criar_planejamento(self, ciclo_id: int, caso_id: int, responsavel_id: int) -> ExecucaoTeste:
        nova_exec = ExecucaoTeste(
            ciclo_teste_id=ciclo_id, caso_teste_id=caso_id, 
            responsavel_id=responsavel_id, status_geral=StatusExecucaoEnum.pendente
        )
        self.db.add(nova_exec)
        await self.db.flush()

        # Copia passos do template para a execução
        passos = (await self.db.execute(select(PassoCasoTeste.id).where(PassoCasoTeste.caso_teste_id == caso_id))).scalars().all()
        if passos:
            self.db.add_all([
                ExecucaoPasso(execucao_teste_id=nova_exec.id, passo_caso_teste_id=pid, status="pendente", resultado_obtido="") 
                for pid in passos
            ])
        
        await self.db.commit()
        return await self.get_by_id(nova_exec.id)

    async def get_by_id(self, exec_id: int) -> Optional[ExecucaoTeste]:
        query = (
            select(ExecucaoTeste)
            .options(
                selectinload(ExecucaoTeste.caso_teste).selectinload(CasoTeste.passos),
                selectinload(ExecucaoTeste.passos_executados).selectinload(ExecucaoPasso.passo_template),
                selectinload(ExecucaoTeste.responsavel)
            )
            .where(ExecucaoTeste.id == exec_id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_minhas_execucoes(self, usuario_id: int) -> Sequence[ExecucaoTeste]:
        query = (
            select(ExecucaoTeste)
            .options(
                selectinload(ExecucaoTeste.caso_teste),
                selectinload(ExecucaoTeste.passos_executados),
                selectinload(ExecucaoTeste.responsavel)
            )
            .where(ExecucaoTeste.responsavel_id == usuario_id)
            .order_by(ExecucaoTeste.updated_at.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update_passo(self, passo_id: int, data: ExecucaoPassoUpdate) -> Optional[ExecucaoPasso]:
        passo = await self.db.get(ExecucaoPasso, passo_id)
        if passo:
            for k, v in data.model_dump(exclude_unset=True).items():
                setattr(passo, k, v)
            await self.db.commit()
            await self.db.refresh(passo)
        return passo

    async def update_status_geral(self, exec_id: int, status: StatusExecucaoEnum) -> Optional[ExecucaoTeste]:
        execucao = await self.db.get(ExecucaoTeste, exec_id)
        if execucao:
            execucao.status_geral = status
            await self.db.commit()
            await self.db.refresh(execucao)
        return execucao