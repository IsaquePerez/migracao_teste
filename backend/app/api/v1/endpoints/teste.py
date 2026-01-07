import shutil
import uuid
import os
import json
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.usuario import Usuario
from app.models.testing import StatusExecucaoEnum

from app.services.caso_teste_service import CasoTesteService
from app.services.ciclo_teste_service import CicloTesteService
from app.services.execucao_teste_service import ExecucaoTesteService

from app.schemas.caso_teste import CasoTesteCreate, CasoTesteResponse, CasoTesteUpdate
from app.schemas.ciclo_teste import CicloTesteCreate, CicloTesteResponse, CicloTesteUpdate
from app.schemas.execucao_teste import (
    ExecucaoTesteCreate, 
    ExecucaoTesteResponse, 
    ExecucaoPassoResponse, 
    ExecucaoPassoUpdate
)

# Cria o roteador que vai agrupar todas as URLs relacionadas aos testes.
router = APIRouter()

# --- DEPENDÊNCIAS DE SERVIÇO ---

# Entrega o serviço de Casos de Teste já conectado ao banco.
def get_caso_service(db: AsyncSession = Depends(get_db)) -> CasoTesteService:
    return CasoTesteService(db)

# Entrega o serviço de Ciclos (Sprints) pronto para uso.
def get_ciclo_service(db: AsyncSession = Depends(get_db)) -> CicloTesteService:
    return CicloTesteService(db)

# Entrega o serviço que cuida da execução dos testes.
def get_execucao_service(db: AsyncSession = Depends(get_db)) -> ExecucaoTesteService:
    return ExecucaoTesteService(db)

# GESTÃO DE CASOS DE TESTE

# Busca e lista todos os casos de teste de um projeto.
@router.get("/projetos/{projeto_id}/casos", response_model=List[CasoTesteResponse])
async def listar_casos_projeto(
    projeto_id: int,
    service: CasoTesteService = Depends(get_caso_service)
):
    return await service.listar_por_projeto(projeto_id)

# Cadastra um novo caso de teste (e já pode vincular a um ciclo se quiser).
@router.post("/projetos/{projeto_id}/casos", response_model=CasoTesteResponse, status_code=status.HTTP_201_CREATED)
async def criar_caso_teste(
    projeto_id: int,
    dados: CasoTesteCreate,
    service: CasoTesteService = Depends(get_caso_service)
):
    # A mágica da alocação automática acontece aqui se vier o ID do ciclo.
    return await service.criar_caso_teste(projeto_id, dados)

# Atualiza os dados de um caso de teste, mas reclama se não achar ele.
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

# Apaga um caso de teste do sistema.
@router.delete("/casos/{caso_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_caso_teste(
    caso_id: int,
    service: CasoTesteService = Depends(get_caso_service)
):
    sucesso = await service.remover_caso(caso_id)
    if not sucesso:
        raise HTTPException(status_code=404, detail="Caso de teste não encontrado")

# GESTÃO DE CICLOS DE TESTE

# Mostra todos os ciclos de teste daquele projeto.
@router.get("/projetos/{projeto_id}/ciclos", response_model=List[CicloTesteResponse])
async def listar_ciclos_projeto(
    projeto_id: int,
    service: CicloTesteService = Depends(get_ciclo_service)
):
    return await service.listar_por_projeto(projeto_id)

# Cria um novo ciclo de testes no projeto.
@router.post("/projetos/{projeto_id}/ciclos", response_model=CicloTesteResponse, status_code=status.HTTP_201_CREATED)
async def criar_ciclo(
    projeto_id: int,
    dados: CicloTesteCreate,
    service: CicloTesteService = Depends(get_ciclo_service)
):
    return await service.criar_ciclo(projeto_id, dados)

# Edita as informações de um ciclo existente.
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

# Deleta um ciclo do banco de dados.
@router.delete("/ciclos/{ciclo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_ciclo(
    ciclo_id: int,
    service: CicloTesteService = Depends(get_ciclo_service)
):
    sucesso = await service.remover_ciclo(ciclo_id)
    if not sucesso:
        raise HTTPException(status_code=404, detail="Ciclo não encontrado")

# EXECUÇÃO E PLANEJAMENTO

# Cria a execução, juntando o caso de teste, o ciclo e quem vai fazer.
@router.post("/execucoes/", response_model=ExecucaoTesteResponse, status_code=status.HTTP_201_CREATED)
async def criar_execucao(
    dados: ExecucaoTesteCreate,
    service: ExecucaoTesteService = Depends(get_execucao_service)
):
    # Usa o método de alocação para vincular tudo certinho.
    return await service.alocar_teste(dados.ciclo_teste_id, dados.caso_teste_id, dados.responsavel_id)

# Lista as tarefas (testes) que estão atribuídas para mim (usuário logado).
@router.get("/minhas-tarefas", response_model=List[ExecucaoTesteResponse]) 
async def listar_meus_testes(
    status: Optional[StatusExecucaoEnum] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: Usuario = Depends(get_current_user),
    service: ExecucaoTesteService = Depends(get_execucao_service)
):
    return await service.listar_tarefas_usuario(current_user.id, status, skip, limit)

# Pega todos os detalhes de uma execução específica.
@router.get("/execucoes/{execucao_id}", response_model=ExecucaoTesteResponse)
async def obter_execucao(
    execucao_id: int,
    service: ExecucaoTesteService = Depends(get_execucao_service)
):
    execucao = await service.obter_execucao(execucao_id)
    if not execucao:
        raise HTTPException(status_code=404, detail="Execução de teste não encontrada")
    return execucao
    
# Salva o resultado de um passo específico do teste.
@router.put("/execucoes/passos/{passo_id}", response_model=ExecucaoPassoResponse)
async def registrar_passo(
    passo_id: int,
    dados: ExecucaoPassoUpdate,
    service: ExecucaoTesteService = Depends(get_execucao_service)
):
    return await service.registrar_resultado_passo(passo_id, dados)

# Encerra a execução manualmente, definindo se o teste geral passou ou falhou.
@router.put("/execucoes/{execucao_id}/finalizar")
async def finalizar_execucao_manual(
    execucao_id: int,
    status: StatusExecucaoEnum,
    service: ExecucaoTesteService = Depends(get_execucao_service)
):
    execucao = await service.finalizar_execucao(execucao_id, status_final=status)
    
    if not execucao:
        raise HTTPException(status_code=404, detail="Execução não encontrada")
        
    return {"message": "Execução atualizada", "status": status}

# Recebe o upload de prints ou logs para provar o resultado do teste.
@router.post("/passos/{passo_id}/evidencia") 
async def upload_evidencia_passo(
    passo_id: int,
    file: UploadFile = File(...),
    service: ExecucaoTesteService = Depends(get_execucao_service)
):
    return await service.upload_evidencia(passo_id, file)

@router.get("/evidencias/download/{filename}")
async def download_evidencia(filename: str):
    file_path = f"evidencias/{filename}"

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    
    return FileResponse(
        path=file_path, 
        filename=filename, 
        media_type='application/octet-stream' 
    )