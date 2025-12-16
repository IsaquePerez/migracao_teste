from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional
# Importando os schemas aninhados
from app.schemas.caso_teste import CasoTesteResponse, UsuarioSimple

# Classe Base que estava faltando
class ExecucaoTesteBase(BaseModel):
    ciclo_teste_id: int
    caso_teste_id: int
    responsavel_id: int | None = None
    status_geral: str = "pendente"

class ExecucaoPassoBase(BaseModel):
    status: str 
    resultado_obtido: str | None = None

class ExecucaoPassoUpdate(ExecucaoPassoBase):
    pass

class ExecucaoPassoResponse(ExecucaoPassoBase):
    id: int
    execucao_teste_id: int
    passo_caso_teste_id: int
    created_at: datetime
    updated_at: datetime | None = None
    
    model_config = ConfigDict(from_attributes=True)

class ExecucaoTesteResponse(BaseModel):
    id: int
    ciclo_teste_id: int
    caso_teste_id: int
    responsavel_id: int | None = None
    status_geral: str
    created_at: datetime
    updated_at: datetime | None = None
    
    # Objetos aninhados (Schemas Pydantic, não models SQLAlchemy)
    caso_teste: Optional[CasoTesteResponse] = None
    responsavel: Optional[UsuarioSimple] = None
    passos_executados: List[ExecucaoPassoResponse] = []

    model_config = ConfigDict(from_attributes=True)