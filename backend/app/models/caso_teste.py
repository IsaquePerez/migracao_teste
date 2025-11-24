from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class PrioridadeEnum(str, enum.Enum):
    alta = "alta"
    media = "media"
    baixa = "baixa"

class CasoTeste(Base):
    __tablename__ = "casos_teste"

    id = Column(Integer, primary_key=True, index=True)
    projeto_id = Column(Integer, ForeignKey("projetos.id"), nullable=False)
    nome = Column(String, nullable=False)
    descricao = Column(Text)
    pre_condicoes = Column(Text)    
    prioridade = Column(Enum(PrioridadeEnum, name='prioridade_enum', create_type=False), default=PrioridadeEnum.media)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relacionamentos
    projeto = relationship("Projeto", back_populates="casos_teste")
    passos = relationship("PassoCasoTeste", back_populates="caso_teste", cascade="all, delete-orphan")
    execucoes = relationship("ExecucaoTeste", back_populates="caso_teste")