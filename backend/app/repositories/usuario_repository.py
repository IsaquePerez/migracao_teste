from typing import Optional, List, Union, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.usuario import Usuario

class UsuarioRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # GET 
    async def get_by_id(self, user_id: int) -> Optional[Usuario]:
        query = select(Usuario).options(selectinload(Usuario.nivel_acesso)).where(Usuario.id == user_id)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_by_email(self, email: str) -> Optional[Usuario]:
        query = select(Usuario).options(selectinload(Usuario.nivel_acesso)).where(Usuario.email == email)
        result = await self.db.execute(query)
        return result.scalars().first()
    
    async def get_by_username(self, username: str) -> Optional[Usuario]:
        query = select(Usuario).options(selectinload(Usuario.nivel_acesso)).where(Usuario.username == username)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_all_usuarios(self, ativo: Optional[bool] = None) -> List[Usuario]:
        query = select(Usuario).options(selectinload(Usuario.nivel_acesso))
        if ativo is not None:
            query = query.where(Usuario.ativo == ativo)
        result = await self.db.execute(query)
        return result.scalars().all()

    # CREATE 
    async def create(self, usuario: Any) -> Usuario:
        db_obj = Usuario(
            nome=usuario.nome,
            username=usuario.username,
            email=usuario.email,
            senha_hash=usuario.senha, 
            nivel_acesso_id=usuario.nivel_acesso_id,
            ativo=usuario.ativo
        )
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        
        query = select(Usuario).options(selectinload(Usuario.nivel_acesso)).where(Usuario.id == db_obj.id)
        result = await self.db.execute(query)
        return result.scalars().first()

    # UPDATE 
    async def update(self, db_obj: Usuario, obj_in: Union[Any, Dict[str, Any]]) -> Usuario:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
            
        if "senha" in update_data:
            update_data["senha_hash"] = update_data.pop("senha")
            
        for field, value in update_data.items():
            setattr(db_obj, field, value)
            
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    # DELETE 
    async def delete(self, user_id: int) -> bool:
        usuario = await self.get_by_id(user_id)
        if usuario:
            await self.db.delete(usuario)
            await self.db.commit()
            return True
        return False