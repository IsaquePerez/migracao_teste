from pydantic import BaseModel
from typing import Optional

# Resposta do endpoint de login (/token). 
# Devolve o JWT e já manda uns dados do user pra evitar request extra na home.
class Token(BaseModel):
    access_token: str
    token_type: str
    username: str 
    nome: str
    role: str # Importante pro front montar o menu de permissões

# Estrutura interna do que vai codificado dentro do JWT.
class TokenPayload(BaseModel):
    sub: Optional[int] = None # ID do usuário