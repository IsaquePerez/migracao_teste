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

    def _get_load_options(self):
        return [
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.caso_teste).options(
                selectinload(CasoTeste.passos),
                selectinload(CasoTeste.projeto),
                selectinload(CasoTeste.ciclo)
            ),
            
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.ciclo),

            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.responsavel).selectinload(Usuario.nivel_acesso),
            
            selectinload(Defeito.execucao).selectinload(ExecucaoTeste.passos_executados).selectinload(ExecucaoPasso.passo_template)
        ]

    async def create(self, dados: DefeitoCreate) -> Defeito:
        query_existente = (
            select(Defeito)
            .options(*self._get_load_options()) 
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

        novo_defeito = Defeito(**dados.model_dump())
        self.db.add(novo_defeito)
        await self.db.commit()
        
        query_novo = (
            select(Defeito)
            .options(*self._get_load_options()) 
            .where(Defeito.id == novo_defeito.id)
        )
        result = await self.db.execute(query_novo)
        return result.scalars().first()

    async def get_by_execucao(self, execucao_id: int) -> Sequence[Defeito]:
        query = (
            select(Defeito)
            .options(*self._get_load_options())
            .where(Defeito.execucao_teste_id == execucao_id)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update(self, id: int, dados: dict) -> Optional[Defeito]:
        defeito = await self.db.get(Defeito, id)
        if not defeito:
            return None
            
        for key, value in dados.items():
            setattr(defeito, key, value)
            
        await self.db.commit()
        
        query = (
            select(Defeito)
            .options(*self._get_load_options())
            .where(Defeito.id == id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_all(self, responsavel_id: Optional[int] = None) -> Sequence[Defeito]:
        query = (
            select(Defeito)
            .join(Defeito.execucao)
            .options(*self._get_load_options())
            .order_by(Defeito.id.desc())
        )

        if responsavel_id:
            query = query.where(ExecucaoTeste.responsavel_id == responsavel_id)

        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def delete(self, id: int) -> bool:
        defeito = await self.db.get(Defeito, id)
        if defeito:
            await self.db.delete(defeito)
            await self.db.commit()
            return True
        return False