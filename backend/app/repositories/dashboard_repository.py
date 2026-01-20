from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc
from app.models.modulo import Modulo
from app.models.projeto import Projeto, StatusProjetoEnum
from app.models.testing import (
    CicloTeste, StatusCicloEnum, 
    CasoTeste, 
    Defeito, StatusDefeitoEnum, SeveridadeDefeitoEnum,
    ExecucaoTeste, StatusExecucaoEnum
)
# Seus imports normais...

class DashboardRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_kpis_gerais(self, sistema_id: int = None):
        # --- 1. PROJETOS ---
        q_projetos = select(func.count(Projeto.id)).where(Projeto.status == StatusProjetoEnum.ativo)
        if sistema_id:
            q_projetos = q_projetos.where(Projeto.sistema_id == sistema_id)

        # --- 2. CICLOS ---
        q_ciclos = select(func.count(CicloTeste.id)).join(Projeto).where(
            CicloTeste.status.in_([StatusCicloEnum.em_execucao, StatusCicloEnum.planejado])
        )
        if sistema_id:
            q_ciclos = q_ciclos.where(Projeto.sistema_id == sistema_id)

        # --- 3. CASOS DE TESTE ---
        q_casos = select(func.count(CasoTeste.id)).join(Projeto)
        if sistema_id:
            q_casos = q_casos.where(Projeto.sistema_id == sistema_id)

        # --- 4. DEFEITOS ABERTOS ---
        # Defeito -> Execucao -> Caso -> Projeto -> Sistema
        q_defeitos_abertos = (
            select(func.count(Defeito.id))
            .join(Defeito.execucao)
            .join(ExecucaoTeste.caso_teste)
            .join(CasoTeste.projeto)
            .where(Defeito.status.in_([StatusDefeitoEnum.aberto, StatusDefeitoEnum.em_teste]))
        )
        if sistema_id:
            q_defeitos_abertos = q_defeitos_abertos.where(Projeto.sistema_id == sistema_id)

        # --- 5. DEFEITOS CRITICOS/ALTOS ---
        q_criticos = (
            select(func.count(Defeito.id))
            .join(Defeito.execucao)
            .join(ExecucaoTeste.caso_teste)
            .join(CasoTeste.projeto)
            .where(
                Defeito.status != StatusDefeitoEnum.fechado,
                Defeito.severidade.in_([SeveridadeDefeitoEnum.critico, SeveridadeDefeitoEnum.alto])
            )
        )
        if sistema_id:
            q_criticos = q_criticos.where(Projeto.sistema_id == sistema_id)

        # --- 6. AGUARDANDO RETESTE ---
        q_reteste = (
            select(func.count(Defeito.id))
            .join(Defeito.execucao)
            .join(ExecucaoTeste.caso_teste)
            .join(CasoTeste.projeto)
            .where(Defeito.status == StatusDefeitoEnum.corrigido)
        )
        if sistema_id:
            q_reteste = q_reteste.where(Projeto.sistema_id == sistema_id)

        # --- 7. EXECUÇÕES PENDENTES ---
        q_pendentes = (
            select(func.count(ExecucaoTeste.id))
            .join(ExecucaoTeste.caso_teste)
            .join(CasoTeste.projeto)
            .where(
                ExecucaoTeste.status_geral.in_([
                    StatusExecucaoEnum.pendente, 
                    StatusExecucaoEnum.em_progresso,
                    StatusExecucaoEnum.reteste
                ])
            )
        )
        if sistema_id:
            q_pendentes = q_pendentes.where(Projeto.sistema_id == sistema_id)

        # --- 8. FINALIZADOS (Para taxa de sucesso) ---
        q_finalizados = (
            select(func.count(ExecucaoTeste.id))
            .join(ExecucaoTeste.caso_teste)
            .join(CasoTeste.projeto)
            .where(ExecucaoTeste.status_geral == StatusExecucaoEnum.fechado)
        )
        if sistema_id:
            q_finalizados = q_finalizados.where(Projeto.sistema_id == sistema_id)

        # --- EXECUÇÃO ---
        r = {}
        r["total_projetos"] = (await self.db.execute(q_projetos)).scalar() or 0
        r["total_ciclos_ativos"] = (await self.db.execute(q_ciclos)).scalar() or 0
        r["total_casos_teste"] = (await self.db.execute(q_casos)).scalar() or 0
        r["total_defeitos_abertos"] = (await self.db.execute(q_defeitos_abertos)).scalar() or 0
        r["total_pendentes"] = (await self.db.execute(q_pendentes)).scalar() or 0
        r["total_defeitos_criticos"] = (await self.db.execute(q_criticos)).scalar() or 0
        r["total_aguardando_reteste"] = (await self.db.execute(q_reteste)).scalar() or 0
        
        tot_fin = (await self.db.execute(q_finalizados)).scalar() or 0
        tot_geral = r["total_pendentes"] + tot_fin
        
        r["taxa_sucesso_ciclos"] = round((tot_fin / tot_geral * 100), 1) if tot_geral > 0 else 0.0

        return r

    async def get_status_execucao_geral(self, sistema_id: int = None):
        query = (
            select(ExecucaoTeste.status_geral, func.count(ExecucaoTeste.id))
            .join(ExecucaoTeste.caso_teste)
            .join(CasoTeste.projeto)
            .group_by(ExecucaoTeste.status_geral)
        )
        if sistema_id:
            query = query.where(Projeto.sistema_id == sistema_id)
            
        result = await self.db.execute(query)
        return result.all()

    async def get_defeitos_por_severidade(self, sistema_id: int = None):
        query = (
            select(Defeito.severidade, func.count(Defeito.id))
            .join(Defeito.execucao)
            .join(ExecucaoTeste.caso_teste)
            .join(CasoTeste.projeto)
            .where(Defeito.status != StatusDefeitoEnum.fechado)
            .group_by(Defeito.severidade)
        )
        if sistema_id:
            query = query.where(Projeto.sistema_id == sistema_id)
            
        result = await self.db.execute(query)
        return result.all()
    
    async def get_modulos_com_mais_defeitos(self, limit: int = 5, sistema_id: int = None):
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
        
        if sistema_id:
            query = query.where(Projeto.sistema_id == sistema_id)

        result = await self.db.execute(query)
        return result.all()