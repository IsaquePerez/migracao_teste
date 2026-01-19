from pydantic import BaseModel
from typing import List, Optional

class DashboardKPI(BaseModel):
    total_projetos: int
    total_ciclos_ativos: int
    total_casos_teste: int
    total_defeitos_abertos: int
    
    taxa_sucesso_ciclos: float
    total_bloqueados: int
    total_defeitos_criticos: int
    total_aguardando_reteste: int

class ChartDataPoint(BaseModel):
    label: str
    value: int
    color: Optional[str] = None

class DashboardCharts(BaseModel):
    status_execucao: List[ChartDataPoint]
    defeitos_por_severidade: List[ChartDataPoint]
    top_modulos_defeitos: List[ChartDataPoint]

class DashboardResponse(BaseModel):
    kpis: DashboardKPI
    charts: DashboardCharts