from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

# --- SCHEMAS AUXILIARES (USUÁRIO) ---
class UsuarioSimple(BaseModel):
    id: int
    nome: str
    username: str
    model_config = ConfigDict(from_attributes=True)

# --- PASSOS DO CASO DE TESTE ---

class PassoCasoTesteBase(BaseModel):
    ordem: int
    acao: str
    resultado_esperado: str

class PassoCasoTesteCreate(PassoCasoTesteBase):
    pass

# [IMPORTANTE] Esta classe precisa estar aqui para ser importada
class PassoCasoTesteResponse(PassoCasoTesteBase):
    id: int
    caso_teste_id: int
    
    # Datas opcionais para evitar erro se vier nulo do banco
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# --- CASO DE TESTE ---

class CasoTesteBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    pre_condicoes: Optional[str] = None
    criterios_aceitacao: Optional[str] = None
    prioridade: str = "media"

class CasoTesteCreate(CasoTesteBase):
    responsavel_id: Optional[int] = None
    ciclo_id: Optional[int] = None
    passos: List[PassoCasoTesteCreate] = []

class CasoTesteUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    pre_condicoes: Optional[str] = None
    criterios_aceitacao: Optional[str] = None
    prioridade: Optional[str] = None
    responsavel_id: Optional[int] = None
    passos: Optional[List[dict]] = None 

class CasoTesteResponse(CasoTesteBase):
    id: int
    projeto_id: int
    responsavel_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Relacionamentos
    responsavel: Optional[UsuarioSimple] = None
    passos: List[PassoCasoTesteResponse] = [] 

    model_config = ConfigDict(from_attributes=True)