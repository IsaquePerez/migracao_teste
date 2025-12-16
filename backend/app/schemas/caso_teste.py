from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional

# Schema Simples para Usuário (dentro do caso de teste)
class UsuarioSimple(BaseModel):
    id: int
    nome: str
    username: str | None = None
    model_config = ConfigDict(from_attributes=True)

class PassoTeste(BaseModel):
    id: Optional[int] = None # Adicionado ID para permitir updates
    ordem: int
    acao: str
    resultado_esperado: str
    model_config = ConfigDict(from_attributes=True) # Importante para ler do ORM

class CasoTesteBase(BaseModel):
    nome: str
    descricao: str | None = None
    pre_condicoes: str | None = None
    criterios_aceitacao: str | None = None
    prioridade: str = "media"
    passos: List[PassoTeste] = []

class CasoTesteCreate(CasoTesteBase):
    ciclo_id: int | None = None
    responsavel_id: int | None = None

class CasoTesteUpdate(BaseModel):
    nome: str | None = None
    descricao: str | None = None
    pre_condicoes: str | None = None
    criterios_aceitacao: str | None = None
    prioridade: str | None = None
    passos: List[PassoTeste] | None = None
    responsavel_id: int | None = None

class CasoTesteResponse(CasoTesteBase):
    id: int
    projeto_id: int
    responsavel_id: int | None = None
    responsavel: Optional[UsuarioSimple] = None 
    
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)