from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.usuario import Usuario
from app.models.password_reset import PasswordReset
from app.services.email_service import send_reset_password_email

router = APIRouter()

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

@router.post("/")
async def forgot_password(
    request: ForgotPasswordRequest, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Usuario).filter(Usuario.email == request.email))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="E-mail não encontrado.")
    
    token = str(uuid.uuid4())
    
    new_reset = PasswordReset(
        id_usuario=user.id,
        token=token,
        expira_em=datetime.utcnow() + timedelta(minutes=15)
    )
    
    try:
        db.add(new_reset)
        await db.commit()
        
        send_reset_password_email(request.email, token)
        
        return {"message": "E-mail de recuperação enviado com sucesso!"}
        
    except Exception as e:
        await db.rollback()
        print(f"Erro no processo de recuperação: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao processar solicitação.")