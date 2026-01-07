from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from typing import Sequence, Optional

from app.repositories.defeito_repository import DefeitoRepository
from app.schemas.defeito import DefeitoCreate, DefeitoUpdate, DefeitoResponse
from app.models.usuario import Usuario
from app.core.errors import tratar_erro_integridade

class DefeitoService:
    def __init__(self, db: AsyncSession):
        self.repo = DefeitoRepository(db)

    async def registrar_defeito(self, dados: DefeitoCreate) -> DefeitoResponse:
        try:
            defeito = await self.repo.create(dados)
            return DefeitoResponse.model_validate(defeito)
        except IntegrityError as e:
            await self.repo.db.rollback()
            # Traduz erro de chave estrangeira caso o ID da execução não exista.
            tratar_erro_integridade(e, {"execucao_teste_id": "Execução de teste inválida."})

    async def listar_por_execucao(self, execucao_id: int) -> Sequence[DefeitoResponse]:
        items = await self.repo.get_by_execucao(execucao_id)
        return [DefeitoResponse.model_validate(i) for i in items]

    # Regra de permissão: Admin vê tudo, QA vê apenas os bugs que ele abriu ou é responsável.
    async def listar_todos(self, usuario_logado: Usuario) -> Sequence[DefeitoResponse]:
        filtro_responsavel = None
        if usuario_logado.nivel_acesso.nome != 'admin':
            filtro_responsavel = usuario_logado.id
            
        items = await self.repo.get_all(responsavel_id=filtro_responsavel)
        return [DefeitoResponse.model_validate(i) for i in items]

    async def atualizar_defeito(self, id: int, dados: DefeitoUpdate) -> Optional[DefeitoResponse]:
        update_data = dados.model_dump(exclude_unset=True)
        try:
            updated = await self.repo.update(id, update_data)
            if updated:
                return DefeitoResponse.model_validate(updated)
            return None
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e)
    
    async def excluir_defeito(self, id: int) -> bool:
        return await self.repo.delete(id)