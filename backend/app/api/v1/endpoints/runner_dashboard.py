from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import RunnerDashboardResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=RunnerDashboardResponse)
async def get_runner_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Instancia o serviço e busca os dados de performance
    service = DashboardService(db)
    return await service.get_runner_dashboard_data()