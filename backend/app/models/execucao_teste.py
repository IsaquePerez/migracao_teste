import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class StatusExecucaoEnum(str, enum.Enum):
    pendente = "pendente"
    em_progresso = "em_progresso"
    passou = "passou"
    falhou = "falhou"
    bloqueado = "bloqueado"
    
class ExecucaoTeste(Base):
    __tablename__ = "execucoes_teste"

    id = Column(Integer, primary_key=True, index=True)
    ciclo_teste_id = Column(Integer, ForeignKey("ciclos_teste.id"), nullable=False)
    caso_teste_id = Column(Integer, ForeignKey("casos_teste.id"), nullable=False)
    responsavel_id = Column(Integer, ForeignKey("usuarios.id"))
    status_geral = Column(Enum(StatusExecucaoEnum, name='status_execucao_enum', create_type=False), default=StatusExecucaoEnum.pendente)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relacionamentos
    ciclo = relationship("CicloTeste", back_populates="execucoes")
    caso_teste = relationship("CasoTeste", back_populates="execucoes")
    responsavel = relationship("Usuario", back_populates="execucoes_atribuidas")
    passos_executados = relationship("ExecucaoPasso", back_populates="execucao_pai", cascade="all, delete-orphan")