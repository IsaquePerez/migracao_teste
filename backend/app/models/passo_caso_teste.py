import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class PassoCasoTeste(Base):
    __tablename__ = "passos_caso_teste"

    id = Column(Integer, primary_key=True, index=True)
    caso_teste_id = Column(Integer, ForeignKey("casos_teste.id"), nullable=False)
    ordem = Column(Integer, nullable=False)
    acao = Column(Text, nullable=False)
    resultado_esperado = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relacionamentos
    caso_teste = relationship("CasoTeste", back_populates="passos")
    execucoes_deste_passo = relationship("ExecucaoPasso", back_populates="passo_template")