from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.repositories.dashboard_repository import DashboardRepository
from app.services.dashboard_service import DashboardService          

router = APIRouter()

@router.get("/")
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    repo = DashboardRepository(db)    
    service = DashboardService(repo)
    
    return await service.get_dashboard_data()