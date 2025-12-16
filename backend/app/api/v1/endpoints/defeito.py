from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.services.defeito_service import DefeitoService
from app.schemas.defeito import DefeitoCreate, DefeitoResponse, DefeitoUpdate
from app.models.usuario import Usuario 
from app.api.deps import get_current_user

router = APIRouter()

def get_service(db: AsyncSession = Depends(get_db)) -> DefeitoService:
    return DefeitoService(db)

@router.post("/", response_model=DefeitoResponse, status_code=status.HTTP_201_CREATED)
async def criar_defeito(
    dados: DefeitoCreate, 
    service: DefeitoService = Depends(get_service)
):
    return await service.registrar_defeito(dados)

@router.get("/execucao/{execucao_id}", response_model=List[DefeitoResponse])
async def listar_defeitos_execucao(
    execucao_id: int, 
    service: DefeitoService = Depends(get_service)
):
    return await service.listar_por_execucao(execucao_id)

# --- ENDPOINT LIMPO ---
@router.get("/", response_model=List[DefeitoResponse])
async def listar_todos_defeitos(
    current_user: Usuario = Depends(get_current_user),
    service: DefeitoService = Depends(get_service)
):
    return await service.listar_todos(current_user)

@router.put("/{id}", response_model=DefeitoResponse)
async def atualizar_defeito(
    id: int, 
    dados: DefeitoUpdate, 
    service: DefeitoService = Depends(get_service)
):
    defeito = await service.atualizar_defeito(id, dados)
    if not defeito:
        raise HTTPException(status_code=404, detail="Defeito não encontrado")
    return defeito