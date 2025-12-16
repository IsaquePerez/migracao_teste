from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import delete, update as sqlalchemy_update
from typing import Sequence, Optional

from app.models.testing import CasoTeste, PassoCasoTeste, ExecucaoTeste, ExecucaoPasso, Defeito
from app.models.usuario import Usuario
from app.schemas.caso_teste import CasoTesteCreate

class CasoTesteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_nome_projeto(self, nome: str, projeto_id: int) -> Optional[CasoTeste]:
        query = select(CasoTeste).where(CasoTeste.nome == nome, CasoTeste.projeto_id == projeto_id)
        result = await self.db.execute(query)
        return result.scalars().first()
    
    async def get_by_projeto(self, projeto_id: int) -> Sequence[CasoTeste]:
        query = (
            select(CasoTeste)
            .options(
                selectinload(CasoTeste.passos),
                selectinload(CasoTeste.responsavel).selectinload(Usuario.nivel_acesso)
            )
            .where(CasoTeste.projeto_id == projeto_id)
            .order_by(CasoTeste.id.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create(self, projeto_id: int, caso_data: CasoTesteCreate) -> CasoTeste:
        db_caso = CasoTeste(
            projeto_id=projeto_id,
            **caso_data.model_dump(exclude={'passos', 'ciclo_id'})
        )
        self.db.add(db_caso)
        await self.db.flush()

        if caso_data.passos:
            passos_objs = [
                PassoCasoTeste(caso_teste_id=db_caso.id, **p.model_dump()) 
                for p in caso_data.passos
            ]
            self.db.add_all(passos_objs)
        
        await self.db.commit()
        return await self.get_by_id(db_caso.id)

    async def get_by_id(self, caso_id: int) -> Optional[CasoTeste]:
        query = (
            select(CasoTeste)
            .options(
                selectinload(CasoTeste.passos),
                selectinload(CasoTeste.responsavel).selectinload(Usuario.nivel_acesso)
            )
            .where(CasoTeste.id == caso_id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def update(self, caso_id: int, dados: dict) -> Optional[CasoTeste]:
        passos_data = dados.pop('passos', None)

        # 1. Atualiza campos simples
        if dados:
            await self.db.execute(
                sqlalchemy_update(CasoTeste).where(CasoTeste.id == caso_id).values(**dados)
            )

        # 2. Gestão Inteligente de Passos
        if passos_data is not None:
            # A. Identificar IDs que vieram no payload
            incoming_ids = [p['id'] for p in passos_data if 'id' in p and p['id']]
            
            # B. Apagar passos que existem no banco mas NÃO vieram no payload
            if incoming_ids:
                await self.db.execute(
                    delete(PassoCasoTeste)
                    .where(PassoCasoTeste.caso_teste_id == caso_id)
                    .where(PassoCasoTeste.id.notin_(incoming_ids))
                )
            else:
                # Se não veio nenhum ID e a lista não é vazia, talvez sejam todos novos. 
                # Se a lista for vazia [], apaga tudo.
                if not passos_data: 
                     await self.db.execute(delete(PassoCasoTeste).where(PassoCasoTeste.caso_teste_id == caso_id))

            # C. Atualizar ou Criar
            for passo in passos_data:
                if 'id' in passo and passo['id']:
                    await self.db.execute(
                        sqlalchemy_update(PassoCasoTeste)
                        .where(PassoCasoTeste.id == passo['id'])
                        .values(acao=passo['acao'], resultado_esperado=passo['resultado_esperado'], ordem=passo['ordem'])
                    )
                else:
                    self.db.add(PassoCasoTeste(
                        caso_teste_id=caso_id,
                        acao=passo['acao'],
                        resultado_esperado=passo['resultado_esperado'],
                        ordem=passo['ordem']
                    ))

        await self.db.commit()
        self.db.expire_all()
        return await self.get_by_id(caso_id)

    async def delete(self, caso_id: int) -> bool:
        # Cascade manual para garantir limpeza
        execs = await self.db.execute(select(ExecucaoTeste.id).where(ExecucaoTeste.caso_teste_id == caso_id))
        execs_ids = execs.scalars().all()

        if execs_ids:
            await self.db.execute(delete(ExecucaoPasso).where(ExecucaoPasso.execucao_teste_id.in_(execs_ids)))
            await self.db.execute(delete(Defeito).where(Defeito.execucao_teste_id.in_(execs_ids)))
            await self.db.execute(delete(ExecucaoTeste).where(ExecucaoTeste.id.in_(execs_ids)))

        await self.db.execute(delete(PassoCasoTeste).where(PassoCasoTeste.caso_teste_id == caso_id))
        result = await self.db.execute(delete(CasoTeste).where(CasoTeste.id == caso_id))
        await self.db.commit()
        return result.rowcount > 0