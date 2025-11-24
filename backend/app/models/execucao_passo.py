import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class StatusPassoEnum(str, enum.Enum):
    pendente = "pendente"
    aprovado = "aprovado"
    reprovado = "reprovado"
    bloqueado = "bloqueado"

class ExecucaoPasso(Base):
    __tablename__ = "execucoes_passos"

    id = Column(Integer, primary_key=True, index=True)
    execucao_teste_id = Column(Integer, ForeignKey("execucoes_teste.id"), nullable=False)
    passo_caso_teste_id = Column(Integer, ForeignKey("passos_caso_teste.id"), nullable=False)
    resultado_obtido = Column(Text)
    status = Column(Enum(StatusPassoEnum, name='status_passo_enum', create_type=False), default=StatusPassoEnum.pendente)
    evidencias = Column(Text)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relacionamentos
    execucao_pai = relationship("ExecucaoTeste", back_populates="passos_executados")
    passo_template = relationship("PassoCasoTeste", back_populates="execucoes_deste_passo")