import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum
from sqlalchemy.dialects.postgresql import JSONB 
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class NivelAcessoEnum(str, enum.Enum):
    admin = "admin"
    user = "user"

class NivelAcesso(Base):
    __tablename__ = "niveis_acesso"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(Enum(NivelAcessoEnum, name='nivel_acesso_enum', create_type=False), nullable=False)    
    descricao = Column(Text)
    permissoes = Column(JSONB)    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relacionamentos
    usuarios = relationship("Usuario", back_populates="nivel_acesso")