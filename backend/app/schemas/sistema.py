from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

# Schema base com os campos comuns
class SistemaBase(BaseModel):
    nome: str
    descricao: str | None = None

# Schema para a criação de um novo Sistema (o que a API recebe)
class SistemaCreate(SistemaBase):
    pass 

class SistemaUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None

# Schema para a resposta da API (o que a API devolve)
class SistemaResponse(SistemaBase):
    id: int
    nome: str
    ativo: bool
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)