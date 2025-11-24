from sqlalchemy.ext.asyncio import AsyncSession
from typing import Sequence, Optional, List
from fastapi import HTTPException

from app.models.projeto import Projeto
from app.repositories.projeto_repository import ProjetoRepository
from app.schemas.projeto import ProjetoCreate, ProjetoUpdate, ProjetoResponse

class ProjetoService:
    def __init__(self, db: AsyncSession):
        self.repo = ProjetoRepository(db)

    async def create(self, data: ProjetoCreate) -> ProjetoResponse:
        # Aqui você poderia validar se modulo_id e sistema_id existem antes de criar
        db_obj = Projeto(
            nome=data.nome,
            descricao=data.descricao,
            status=data.status,
            modulo_id=data.modulo_id,
            sistema_id=data.sistema_id,
            responsavel_id=data.responsavel_id
        )
        created = await self.repo.create(db_obj)
        return ProjetoResponse.model_validate(created)

    async def get_all(self) -> List[ProjetoResponse]:
        items = await self.repo.get_all()
        return [ProjetoResponse.model_validate(i) for i in items]

    async def get_by_id(self, id: int) -> Optional[ProjetoResponse]:
        item = await self.repo.get_by_id(id)
        if item:
            return ProjetoResponse.model_validate(item)
        return None

    async def update(self, id: int, data: ProjetoUpdate) -> Optional[ProjetoResponse]:
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
             raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")
             
        updated = await self.repo.update(id, update_data)
        if updated:
            return ProjetoResponse.model_validate(updated)
        return None

    async def delete(self, id: int) -> bool:
        return await self.repo.delete(id)