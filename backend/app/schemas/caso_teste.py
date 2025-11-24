from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from enum import Enum

class PrioridadeEnum(str, Enum):
    alta = "alta"
    media = "media"
    baixa = "baixa"

class CasoTesteBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    criterios_aceitacao: Optional[str] = None
    prioridade: PrioridadeEnum = PrioridadeEnum.media 
    passos: Optional[str] = None
    projeto_id: int

class CasoTesteCreate(CasoTesteBase):
    pass

class CasoTesteUpdate(BaseModel): 
    nome: Optional[str] = None
    descricao: Optional[str] = None
    criterios_aceitacao: Optional[str] = None
    prioridade: Optional[PrioridadeEnum] = None
    passos: Optional[str] = None
    projeto_id: Optional[int] = None

class CasoTesteResponse(CasoTesteBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)