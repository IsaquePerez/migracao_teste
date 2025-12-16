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

    async def create(self, dados: DefeitoCreate) -> Defeito:
        novo_defeito = Defeito(**dados.model_dump())
        self.db.add(novo_defeito)
        await self.db.commit()
        await self.db.refresh(novo_defeito)
        return novo_defeito

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
        await self.db.refresh(defeito)
        return defeito

    # --- NOVO MÉTODO OTIMIZADO ---
    async def get_all(self, responsavel_id: Optional[int] = None) -> Sequence[Defeito]:
        query = (
            select(Defeito)
            .join(Defeito.execucao)
            .options(
                # Carregamento otimizado para evitar N+1
                selectinload(Defeito.execucao).selectinload(ExecucaoTeste.caso_teste).selectinload(CasoTeste.passos),
                selectinload(Defeito.execucao).selectinload(ExecucaoTeste.responsavel).selectinload(Usuario.nivel_acesso),
                selectinload(Defeito.execucao).selectinload(ExecucaoTeste.passos_executados).selectinload(ExecucaoPasso.passo_template)
            )
            .order_by(Defeito.id.desc())
        )

        # Aplica o filtro se um ID for passado (Testador vendo seus defeitos)
        if responsavel_id:
            query = query.where(ExecucaoTeste.responsavel_id == responsavel_id)

        result = await self.db.execute(query)
        return result.scalars().all()