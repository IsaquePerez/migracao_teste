from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.schemas.projeto import ProjetoCreate, ProjetoUpdate, ProjetoResponse
from app.services.projeto_service import ProjetoService

router = APIRouter()

def get_service(db: AsyncSession = Depends(get_db)) -> ProjetoService:
    return ProjetoService(db)

@router.post("/", response_model=ProjetoResponse, status_code=status.HTTP_201_CREATED)
async def create(
    data: ProjetoCreate, 
    service: ProjetoService = Depends(get_service)
):
    return await service.create(data)

@router.get("/", response_model=List[ProjetoResponse])
async def get_all(
    service: ProjetoService = Depends(get_service)
):
    return await service.get_all()

@router.get("/{id}", response_model=ProjetoResponse)
async def get_one(
    id: int, 
    service: ProjetoService = Depends(get_service)
):
    item = await service.get_by_id(id)
    if not item:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return item

@router.put("/{id}", response_model=ProjetoResponse)
async def update(
    id: int, 
    data: ProjetoUpdate, 
    service: ProjetoService = Depends(get_service)
):
    item = await service.update(id, data)
    if not item:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return item

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    id: int, 
    service: ProjetoService = Depends(get_service)
):
    deleted = await service.delete(id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")