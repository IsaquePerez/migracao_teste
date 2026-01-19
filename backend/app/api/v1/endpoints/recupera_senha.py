from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime
from passlib.context import CryptContext
from pydantic import BaseModel
from app.api.deps import get_db
from app.models.usuario import Usuario
from app.models.password_reset import PasswordReset

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str

@router.get("/validate")
async def validate_token(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PasswordReset).filter(PasswordReset.token == token))
    reset_entry = result.scalars().first()
    
    if not reset_entry or reset_entry.expira_em < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token inválido ou expirado.")
    
    return {"message": "Token válido"}

@router.post("/confirm")
async def reset_password_confirm(data: ResetPasswordSchema, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PasswordReset).filter(PasswordReset.token == data.token))
    reset_entry = result.scalars().first()
    
    if not reset_entry or reset_entry.expira_em < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token inválido ou expirado.")
    
    user_result = await db.execute(select(Usuario).filter(Usuario.id == reset_entry.id_usuario))
    user = user_result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    
    user.senha_hash = pwd_context.hash(data.new_password)
    
    await db.delete(reset_entry)
    await db.commit()
    
    return {"message": "Senha atualizada com sucesso!"}