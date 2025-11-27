from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.core.database import get_db
from app.services.defeito_service import DefeitoService
from app.schemas.defeito import DefeitoCreate, DefeitoResponse, DefeitoUpdate
from app.models.testing import Defeito, ExecucaoTeste, CasoTeste, ExecucaoPasso
from app.models.usuario import Usuario 
from app.api.deps import get_current_user # <--- Importar segurança

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

# --- ENDPOINT ALTERADO COM FILTRO INTELIGENTE ---
@router.get("/", response_model=List[DefeitoResponse])
async def listar_todos_defeitos(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user) # Identifica quem chama
):
    # Query base com os carregamentos necessários
    query = (
        select(Defeito)
        .join(Defeito.execucao) # Join necessário para filtrar por responsável
        .options(
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.caso_teste).selectinload(CasoTeste.passos),
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.responsavel).selectinload(Usuario.nivel_acesso),
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.passos_executados).selectinload(ExecucaoPasso.passo_template)
        )
        .order_by(Defeito.id.desc())
    )

    # REGRA DE NEGÓCIO:
    # Se NÃO for admin, filtra apenas defeitos das execuções atribuídas ao usuário logado.
    if current_user.nivel_acesso.nome != 'admin':
        query = query.where(ExecucaoTeste.responsavel_id == current_user.id)

    # (Opcional: Remover o limit para o testador ver todo o seu histórico)
    # query = query.limit(50) 

    result = await db.execute(query)
    return result.scalars().all()

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