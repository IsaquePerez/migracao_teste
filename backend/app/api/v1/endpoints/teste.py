from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Sequence

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.usuario import Usuario
from app.models.testing import StatusExecucaoEnum

# Novos Services Refatorados
from app.services.caso_teste_service import CasoTesteService
from app.services.ciclo_teste_service import CicloTesteService
from app.services.execucao_teste_service import ExecucaoTesteService

# Schemas
from app.schemas.caso_teste import CasoTesteCreate, CasoTesteResponse, CasoTesteUpdate
from app.schemas.ciclo_teste import CicloTesteCreate, CicloTesteResponse, CicloTesteUpdate
from app.schemas.execucao_teste import ExecucaoTesteResponse, ExecucaoPassoResponse, ExecucaoPassoUpdate

router = APIRouter()

# --- DEPENDÊNCIAS DE SERVIÇO ---

def get_caso_service(db: AsyncSession = Depends(get_db)) -> CasoTesteService:
    return CasoTesteService(db)

def get_ciclo_service(db: AsyncSession = Depends(get_db)) -> CicloTesteService:
    return CicloTesteService(db)

def get_execucao_service(db: AsyncSession = Depends(get_db)) -> ExecucaoTesteService:
    return ExecucaoTesteService(db)

# ==============================================================================
# GESTÃO DE CASOS DE TESTE (BIBLIOTECA)
# ==============================================================================

# [NOVO] Rota para listar casos
@router.get("/projetos/{projeto_id}/casos", response_model=List[CasoTesteResponse])
async def listar_casos_projeto(
    projeto_id: int,
    service: CasoTesteService = Depends(get_caso_service)
):
    return await service.listar_por_projeto(projeto_id)

@router.post("/projetos/{projeto_id}/casos", response_model=CasoTesteResponse, status_code=status.HTTP_201_CREATED)
async def criar_caso_teste(
    projeto_id: int,
    dados: CasoTesteCreate,
    service: CasoTesteService = Depends(get_caso_service)
):
    return await service.criar_caso_teste(projeto_id, dados)

@router.put("/casos/{caso_id}", response_model=CasoTesteResponse)
async def atualizar_caso_teste(
    caso_id: int,
    dados: CasoTesteUpdate,
    service: CasoTesteService = Depends(get_caso_service)
):
    caso = await service.atualizar_caso(caso_id, dados)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso de teste não encontrado")
    return caso

@router.delete("/casos/{caso_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_caso_teste(
    caso_id: int,
    service: CasoTesteService = Depends(get_caso_service)
):
    sucesso = await service.remover_caso(caso_id)
    if not sucesso:
        raise HTTPException(status_code=404, detail="Caso de teste não encontrado")

# ==============================================================================
# GESTÃO DE CICLOS DE TESTE (SPRINTS)
# ==============================================================================

# [NOVO] Rota para listar ciclos
@router.get("/projetos/{projeto_id}/ciclos", response_model=List[CicloTesteResponse])
async def listar_ciclos_projeto(
    projeto_id: int,
    service: CicloTesteService = Depends(get_ciclo_service)
):
    return await service.listar_por_projeto(projeto_id)

@router.post("/projetos/{projeto_id}/ciclos", response_model=CicloTesteResponse, status_code=status.HTTP_201_CREATED)
async def criar_ciclo(
    projeto_id: int,
    dados: CicloTesteCreate,
    service: CicloTesteService = Depends(get_ciclo_service)
):
    return await service.criar_ciclo(projeto_id, dados)

@router.put("/ciclos/{ciclo_id}", response_model=CicloTesteResponse)
async def atualizar_ciclo(
    ciclo_id: int,
    dados: CicloTesteUpdate,
    service: CicloTesteService = Depends(get_ciclo_service)
):
    ciclo = await service.atualizar_ciclo(ciclo_id, dados)
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo não encontrado")
    return ciclo

@router.delete("/ciclos/{ciclo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_ciclo(
    ciclo_id: int,
    service: CicloTesteService = Depends(get_ciclo_service)
):
    sucesso = await service.remover_ciclo(ciclo_id)
    if not sucesso:
        raise HTTPException(status_code=404, detail="Ciclo não encontrado")

# ==============================================================================
# EXECUÇÃO E PLANEJAMENTO
# ==============================================================================

@router.post("/execucoes/alocar", response_model=ExecucaoTesteResponse)
async def alocar_teste(
    ciclo_id: int,
    caso_id: int,
    responsavel_id: int,
    service: ExecucaoTesteService = Depends(get_execucao_service)
):
    return await service.alocar_teste(ciclo_id, caso_id, responsavel_id)

@router.get("/execucoes/meus-testes", response_model=List[ExecucaoTesteResponse])
async def listar_meus_testes(
    current_user: Usuario = Depends(get_current_user),
    service: ExecucaoTesteService = Depends(get_execucao_service)
):
    return await service.listar_tarefas_usuario(current_user.id)

@router.put("/execucoes/passos/{passo_id}", response_model=ExecucaoPassoResponse)
async def registrar_passo(
    passo_id: int,
    dados: ExecucaoPassoUpdate,
    service: ExecucaoTesteService = Depends(get_execucao_service)
):
    return await service.registrar_resultado_passo(passo_id, dados)

@router.put("/execucoes/{execucao_id}/finalizar")
async def finalizar_execucao_manual(
    execucao_id: int,
    status_final: StatusExecucaoEnum,
    service: ExecucaoTesteService = Depends(get_execucao_service)
):
    execucao = await service.finalizar_execucao(execucao_id, status_final)
    if not execucao:
        raise HTTPException(status_code=404, detail="Execução não encontrada")
    return {"message": "Execução atualizada", "status": status_final}