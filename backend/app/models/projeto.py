import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

# Define os status possíveis para controle do ciclo de vida do projeto.
class StatusProjetoEnum(str, enum.Enum):
    ativo = "ativo"
    pausado = "pausado"
    finalizado = "finalizado"

# Tabela central que amarra sistemas, módulos e usuários responsáveis.
class Projeto(Base):
    __tablename__ = "projetos"

    id = Column(Integer, primary_key=True, index=True)

    nome = Column(String(100), nullable=False)
    
    # Foreign keys
    modulo_id = Column(Integer, ForeignKey("modulos.id"), nullable=False)
    sistema_id = Column(Integer, ForeignKey("sistemas.id"), nullable=False)
    responsavel_id = Column(Integer, ForeignKey("usuarios.id"))

    descricao = Column(Text)    
    status = Column(Enum(StatusProjetoEnum, name='status_projeto_enum', create_type=False), default=StatusProjetoEnum.ativo)    
    
    # Auditoria
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('modulo_id', 'nome', name='uq_projeto_por_modulo'),
    )

    # Relacionamentos
    modulo = relationship("Modulo", back_populates="projetos")
    sistema = relationship("Sistema", back_populates="projetos")    
    responsavel = relationship("Usuario", back_populates="projetos_gerenciados")
    
    # Se deletar o projeto apaga também seus ciclos e casos de teste.
    ciclos = relationship("CicloTeste", back_populates="projeto", cascade="all, delete-orphan")    
    casos_teste = relationship("CasoTeste", back_populates="projeto")
    metricas = relationship("Metrica", back_populates="projeto")