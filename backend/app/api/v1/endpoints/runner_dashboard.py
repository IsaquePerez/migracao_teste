from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import RunnerDashboardResponse, PerformanceResponse
from app.models.usuario import Usuario
from app.api.deps import get_current_active_user

router = APIRouter()

@router.get("/", response_model=RunnerDashboardResponse)
async def get_runner_dashboard(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    # servico para buscar dados do dashboard pessoal do runner logado
    service = DashboardService(db)
    return await service.get_runner_dashboard_data(runner_id=current_user.id)

@router.get("/performance", response_model=PerformanceResponse)
async def get_performance_dashboard(
    user_id: Optional[int] = Query(None, description="ID do usuário para visão individual"),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    # endpoint de analise de performance 
    # se user_id for passado, filtra pelo testador, senao mostra geral
    service = DashboardService(db)
    return await service.get_performance_analytics(user_id=user_id)