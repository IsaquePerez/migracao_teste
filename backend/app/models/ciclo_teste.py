import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class StatusCicloEnum(str, enum.Enum):
    planejado = "planejado"
    em_execucao = "em_execucao"
    concluido = "concluido"
    pausado = "pausado"
    cancelado = "cancelado"
    erro = "erro"

class CicloTeste(Base):
    __tablename__ = "ciclos_teste"

    id = Column(Integer, primary_key=True, index=True)
    projeto_id = Column(Integer, ForeignKey("projetos.id"), nullable=False)
    nome = Column(String)
    numero = Column(Integer) # Preenchido via trigger ou lógica de app
    descricao = Column(Text)
    data_inicio = Column(DateTime(timezone=True))
    data_fim = Column(DateTime(timezone=True))
    status = Column(Enum(StatusCicloEnum, name='status_ciclo_enum', create_type=False), default=StatusCicloEnum.planejado)    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relacionamentos
    projeto = relationship("Projeto", back_populates="ciclos")
    execucoes = relationship("ExecucaoTeste", back_populates="ciclo")
    metricas = relationship("Metrica", back_populates="ciclo")