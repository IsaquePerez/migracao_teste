from app.repositories.dashboard_repository import DashboardRepository
from app.models.testing import StatusExecucaoEnum

class DashboardService:
    def __init__(self, repo: DashboardRepository):
        self.repo = repo

    async def get_dashboard_data(self):
        # 1. Buscar KPIs
        kpis = await self.repo.get_kpis_gerais()

        # 2. Buscar dados para Gráficos
        raw_status = await self.repo.get_status_execucao_geral()
        raw_severidade = await self.repo.get_defeitos_por_severidade()
        raw_modulos = await self.repo.get_modulos_com_mais_defeitos()

        # 3. Formatar Status Execução
        # ATENÇÃO: Aqui definimos as cores apenas para os status que existem no Enum agora
        status_colors = {
            StatusExecucaoEnum.pendente: "#94a3b8",      # Cinza
            StatusExecucaoEnum.em_progresso: "#3b82f6",  # Azul
            StatusExecucaoEnum.reteste: "#f59e0b",       # Laranja/Amarelo
            StatusExecucaoEnum.fechado: "#10b981",       # Verde
        }

        chart_status = [
            {
                "name": s.value, 
                "label": s.value.replace("_", " ").title(),
                "value": count,
                "color": status_colors.get(s, "#cbd5e1")
            }
            for s, count in raw_status
        ]

        # 4. Formatar Defeitos por Severidade
        severidade_colors = {
            "critico": "#991b1b",
            "alto": "#ef4444",
            "medio": "#f59e0b",
            "baixo": "#3b82f6"
        }
        
        chart_severidade = [
            {
                "name": sev.value,
                "label": sev.value.title(),
                "value": count,
                "color": severidade_colors.get(sev.value, "#8884d8")
            }
            for sev, count in raw_severidade
        ]

        # 5. Formatar Top Módulos
        chart_modulos = [
            {"name": nome, "value": count}
            for nome, count in raw_modulos
        ]

        return {
            "kpis": kpis,
            "charts": {
                "status_execucao": chart_status,
                "defeitos_por_severidade": chart_severidade,
                "top_modulos_defeitos": chart_modulos
            }
        }