from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc

from app.models.projeto import Projeto, StatusProjetoEnum
from app.models.testing import (
    CicloTeste, StatusCicloEnum, 
    CasoTeste, 
    Defeito, StatusDefeitoEnum, SeveridadeDefeitoEnum,
    ExecucaoTeste, StatusExecucaoEnum
)
from app.models.modulo import Modulo

class DashboardRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_kpis_gerais(self):
        # 1. Contagens Básicas
        q_projetos = select(func.count(Projeto.id)).where(Projeto.status == StatusProjetoEnum.ativo)
        
        # CORREÇÃO AQUI: Usando 'planejado' (conforme seu Enum)
        q_ciclos = select(func.count(CicloTeste.id)).where(
            CicloTeste.status.in_([StatusCicloEnum.em_execucao, StatusCicloEnum.planejado])
        )
        
        q_casos = select(func.count(CasoTeste.id))
        
        # 2. Defeitos
        q_defeitos_abertos = select(func.count(Defeito.id)).where(
            Defeito.status.in_([StatusDefeitoEnum.aberto, StatusDefeitoEnum.em_teste])
        )
        
        q_criticos = select(func.count(Defeito.id)).where(
            Defeito.status != StatusDefeitoEnum.fechado,
            Defeito.severidade.in_([
                SeveridadeDefeitoEnum.critico, 
                SeveridadeDefeitoEnum.alto
            ])
        )

        q_aguardando_reteste_defeitos = select(func.count(Defeito.id)).where(
            Defeito.status == StatusDefeitoEnum.corrigido
        )

        # 3. Execuções Pendentes
        # Contamos TUDO que não está fechado, independente do status do ciclo
        q_pendentes = select(func.count(ExecucaoTeste.id)).where(
            ExecucaoTeste.status_geral.in_([
                StatusExecucaoEnum.pendente, 
                StatusExecucaoEnum.em_progresso,
                StatusExecucaoEnum.reteste
            ])
        )

        # 4. Finalizados
        q_total_finalizados = select(func.count(ExecucaoTeste.id)).where(
            ExecucaoTeste.status_geral == StatusExecucaoEnum.fechado
        )

        # Executa as queries
        results = {}
        results["total_projetos"] = (await self.db.execute(q_projetos)).scalar() or 0
        results["total_ciclos_ativos"] = (await self.db.execute(q_ciclos)).scalar() or 0
        results["total_casos_teste"] = (await self.db.execute(q_casos)).scalar() or 0
        results["total_defeitos_abertos"] = (await self.db.execute(q_defeitos_abertos)).scalar() or 0
        
        results["total_pendentes"] = (await self.db.execute(q_pendentes)).scalar() or 0
        results["total_defeitos_criticos"] = (await self.db.execute(q_criticos)).scalar() or 0
        results["total_aguardando_reteste"] = (await self.db.execute(q_aguardando_reteste_defeitos)).scalar() or 0
        
        # Taxa de sucesso
        total_execucoes = results["total_pendentes"] + (await self.db.execute(q_total_finalizados)).scalar() or 0
        
        if total_execucoes > 0:
            total_fechados = (await self.db.execute(q_total_finalizados)).scalar() or 0
            results["taxa_sucesso_ciclos"] = round((total_fechados / total_execucoes) * 100, 1)
        else:
            results["taxa_sucesso_ciclos"] = 0.0

        return results

    async def get_status_execucao_geral(self):
        query = (
            select(ExecucaoTeste.status_geral, func.count(ExecucaoTeste.id))
            # Removemos o JOIN restritivo
            # .join(CicloTeste) 
            # Removemos o WHERE que escondia os dados
            # .where(CicloTeste.status == StatusCicloEnum.em_execucao)
            .group_by(ExecucaoTeste.status_geral)
        )
        result = await self.db.execute(query)
        
        # Dica Extra: O Backend retorna Tuplas [(status, count)]. 
        # O Service que chama isso geralmente formata para o Front.
        return result.all()

    async def get_defeitos_por_severidade(self):
        query = (
            select(Defeito.severidade, func.count(Defeito.id))
            .where(Defeito.status != StatusDefeitoEnum.fechado)
            .group_by(Defeito.severidade)
        )
        result = await self.db.execute(query)
        return result.all()

    async def get_modulos_com_mais_defeitos(self, limit: int = 5):
        query = (
            select(Modulo.nome, func.count(Defeito.id))
            .select_from(Defeito)
            .join(Defeito.execucao)
            .join(ExecucaoTeste.caso_teste)
            .join(CasoTeste.projeto)
            .join(Projeto.modulo)
            .group_by(Modulo.nome)
            .order_by(desc(func.count(Defeito.id)))
            .limit(limit)
        )
        result = await self.db.execute(query)
        return result.all()