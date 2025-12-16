from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from typing import Sequence, Optional

from app.models import Sistema
from app.repositories.sistema_repository import SistemaRepository
from app.schemas import SistemaCreate, SistemaUpdate
from app.core.errors import tratar_erro_integridade

class SistemaService:
    def __init__(self, db: AsyncSession):
        self.repo = SistemaRepository(db)

    async def create_sistema(self, sistema_data: SistemaCreate) -> Sistema:
        existente = await self.repo.get_by_nome(sistema_data.nome)
        if existente:
            raise HTTPException(status_code=400, detail=f"Sistema com nome '{sistema_data.nome}' já existe.")

        try:
            return await self.repo.create_sistema(sistema_data)
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e)

    async def get_all_sistemas(self) -> Sequence[Sistema]:
        return await self.repo.get_all_sistemas()

    async def get_sistema_by_id(self, sistema_id: int) -> Sistema | None:
        return await self.repo.get_sistema_by_id(sistema_id)

    async def update_sistema(self, sistema_id: int, sistema_data: SistemaUpdate) -> Optional[Sistema]:
        try:
            return await self.repo.update_sistema(sistema_id, sistema_data)
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e, {"nome": "Já existe um sistema com este nome."})

    async def delete_sistema(self, sistema_id: int) -> bool:
        try:
            return await self.repo.delete_sistema(sistema_id)
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e, {
                "foreign key": "Não é possível excluir este sistema pois ele possui Módulos ou Projetos vinculados."
            })