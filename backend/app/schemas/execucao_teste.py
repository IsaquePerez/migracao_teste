from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional

# Importando os schemas aninhados
from app.schemas.caso_teste import CasoTesteResponse, UsuarioSimple, PassoCasoTesteResponse
# Importando StatusExecucaoEnum se necessário, mas aqui usaremos string ou enum
from app.models.testing import StatusExecucaoEnum

# --- CLASSES BASE ---

class ExecucaoTesteBase(BaseModel):
    ciclo_teste_id: int
    caso_teste_id: int
    responsavel_id: int
    status_geral: str = "pendente"

class ExecucaoPassoBase(BaseModel):
    status: str 
    resultado_obtido: Optional[str] = None
    evidencias: Optional[str] = None

# --- CREATE (A CLASSE QUE FALTAVA) ---
class ExecucaoTesteCreate(ExecucaoTesteBase):
    pass

# --- UPDATE ---

class ExecucaoPassoUpdate(BaseModel):
    status: Optional[str] = None
    resultado_obtido: Optional[str] = None
    evidencias: Optional[str] = None

# --- RESPONSE ---

class ExecucaoPassoResponse(ExecucaoPassoBase):
    id: int
    execucao_teste_id: int
    passo_caso_teste_id: int
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    passo_template: Optional[PassoCasoTesteResponse] = None     
    
    model_config = ConfigDict(from_attributes=True)

class ExecucaoTesteResponse(ExecucaoTesteBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    caso_teste: Optional[CasoTesteResponse] = None
    responsavel: Optional[UsuarioSimple] = None
    passos_executados: List[ExecucaoPassoResponse] = []

    model_config = ConfigDict(from_attributes=True)