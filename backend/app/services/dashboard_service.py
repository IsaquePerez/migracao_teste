from app.repositories.dashboard_repository import DashboardRepository
from app.models.testing import StatusExecucaoEnum

class DashboardService:
    def __init__(self, repo: DashboardRepository):
        self.repo = repo

    # 1. RECEBE O SISTEMA_ID AQUI (Padrão None para quando não tiver filtro)
    async def get_dashboard_data(self, sistema_id: int = None):
        
        # 2. REPASSA PARA O REPOSITÓRIO
        kpis = await self.repo.get_kpis_gerais(sistema_id)

        # 3. REPASSA PARA OS GRÁFICOS TAMBÉM
        raw_status = await self.repo.get_status_execucao_geral(sistema_id)
        raw_severidade = await self.repo.get_defeitos_por_severidade(sistema_id)
        
        # O gráfico de módulos não alteramos no repo anterior, então mantém sem filtro por enquanto
        # Se quiser filtrar módulos também, precisa atualizar o método no repository primeiro.
        raw_modulos = await self.repo.get_modulos_com_mais_defeitos()

        # 4. Formatar Status Execução
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

        # 5. Formatar Defeitos por Severidade
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

        # 6. Formatar Top Módulos
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