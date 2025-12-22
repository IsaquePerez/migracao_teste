from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Sequence, Optional

from app.models.testing import Defeito, ExecucaoTeste, CasoTeste, ExecucaoPasso
from app.models.usuario import Usuario
from app.schemas.defeito import DefeitoCreate

class DefeitoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # Helper para não repetir as opções de carregamento gigantes
    def _get_load_options(self):
        return [
            # Carrega: Defeito -> Execução -> Caso de Teste -> Passos
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.caso_teste).selectinload(CasoTeste.passos),
            
            # Carrega: Defeito -> Execução -> Responsável -> Nivel
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.responsavel).selectinload(Usuario.nivel_acesso),
            
            # Carrega: Defeito -> Execução -> Passos Executados -> Template
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.passos_executados).selectinload(ExecucaoPasso.passo_template)
        ]

    async def create(self, dados: DefeitoCreate) -> Defeito:
        # 1. BLINDAGEM: Verifica duplicidade com carregamento COMPLETO
        query_existente = (
            select(Defeito)
            .options(*self._get_load_options()) # <--- Usa o helper aqui
            .where(
                Defeito.execucao_teste_id == dados.execucao_teste_id,
                Defeito.titulo == dados.titulo,
                Defeito.status != 'fechado'
            )
        )
        
        result = await self.db.execute(query_existente)
        defeito_existente = result.scalars().first()

        if defeito_existente:
            return defeito_existente

        # 2. Cria o novo
        novo_defeito = Defeito(**dados.model_dump())
        self.db.add(novo_defeito)
        await self.db.commit()
        
        # 3. Busca o novo com TODOS os relacionamentos profundos
        query_novo = (
            select(Defeito)
            .options(*self._get_load_options()) # <--- Usa o helper aqui também
            .where(Defeito.id == novo_defeito.id)
        )
        result = await self.db.execute(query_novo)
        return result.scalars().first()

    async def get_by_execucao(self, execucao_id: int) -> Sequence[Defeito]:
        query = select(Defeito).where(Defeito.execucao_teste_id == execucao_id)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update(self, id: int, dados: dict) -> Optional[Defeito]:
        defeito = await self.db.get(Defeito, id)
        if not defeito:
            return None
        for key, value in dados.items():
            setattr(defeito, key, value)
        await self.db.commit()
        
        # Recarrega completo para o retorno
        query = (
            select(Defeito)
            .options(*self._get_load_options()) # <--- Usa o helper aqui também
            .where(Defeito.id == id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_all(self, responsavel_id: Optional[int] = None) -> Sequence[Defeito]:
        query = (
            select(Defeito)
            .join(Defeito.execucao)
            .options(*self._get_load_options()) # <--- Usa o helper aqui
            .order_by(Defeito.id.desc())
        )

        if responsavel_id:
            query = query.where(ExecucaoTeste.responsavel_id == responsavel_id)

        result = await self.db.execute(query)
        return result.scalars().all()