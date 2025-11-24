from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Modulo(Base):
    __tablename__ = "modulos"

    id = Column(Integer, primary_key=True, index=True)
    sistema_id = Column(Integer, ForeignKey("sistemas.id"), nullable=False)
    nome = Column(String(255), nullable=False)
    descricao = Column(Text)
    ordem = Column(Integer)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relacionamentos
    sistema = relationship("Sistema", back_populates="modulos")
    projetos = relationship("Projeto", back_populates="modulo")