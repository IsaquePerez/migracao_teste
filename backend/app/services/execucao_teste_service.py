from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, UploadFile # Adicione UploadFile se for usar o upload
from typing import Optional, List # <--- ADICIONE ESTA LINHA AQUI
from app.repositories.execucao_teste_repository import ExecucaoTesteRepository
from app.repositories.ciclo_teste_repository import CicloTesteRepository
from app.repositories.caso_teste_repository import CasoTesteRepository
from app.schemas.execucao_teste import ExecucaoTesteResponse, ExecucaoPassoResponse, ExecucaoPassoUpdate
from app.models.testing import StatusExecucaoEnum
import json
import shutil
import uuid
import os

class ExecucaoTesteService:
    def __init__(self, db: AsyncSession):
        self.repo = ExecucaoTesteRepository(db)
        # Repositórios auxiliares para validação
        self.ciclo_repo = CicloTesteRepository(db)
        self.caso_repo = CasoTesteRepository(db)

    async def alocar_teste(self, ciclo_id: int, caso_id: int, responsavel_id: int):
        # 1. Validações
        ciclo = await self.ciclo_repo.get_by_id(ciclo_id)
        if not ciclo:
             raise HTTPException(status_code=404, detail="Ciclo não encontrado")
        
        # (Opcional) Verificar se o ciclo está ativo/em execução antes de alocar
        
        caso = await self.caso_repo.get_by_id(caso_id)
        if not caso:
             raise HTTPException(status_code=404, detail="Caso de Teste não encontrado")

        # 2. Criação
        # CORREÇÃO AQUI: criar_planejamento (era criar_planejamento_execucao)
        nova_execucao = await self.repo.criar_planejamento(ciclo_id, caso_id, responsavel_id)
        
        return ExecucaoTesteResponse.model_validate(nova_execucao)

    async def listar_tarefas_usuario(
        self, 
        usuario_id: int,
        status: Optional[StatusExecucaoEnum] = None,
        skip: int = 0,
        limit: int = 20
    ):
        # Repassa os filtros para o repo
        items = await self.repo.get_minhas_execucoes(usuario_id, status, skip, limit)
        return [ExecucaoTesteResponse.model_validate(i) for i in items]
    
    async def obter_execucao(self, execucao_id: int):
        execucao = await self.repo.get_by_id(execucao_id)
        if not execucao:
            return None
        return ExecucaoTesteResponse.model_validate(execucao)

    async def registrar_resultado_passo(self, passo_id: int, dados: ExecucaoPassoUpdate):
        passo = await self.repo.get_execucao_passo(passo_id)
        if not passo:
             raise HTTPException(status_code=404, detail="Passo da execução não encontrado")
        
        atualizado = await self.repo.update_passo(passo_id, dados)
        return ExecucaoPassoResponse.model_validate(atualizado)
    
    async def finalizar_execucao(self, execucao_id: int, status_final: StatusExecucaoEnum):
        execucao = await self.repo.get_by_id(execucao_id)
        if not execucao:
             return None
        
        return await self.repo.update_status_geral(execucao_id, status_final)
    
    async def upload_evidencia(self, passo_id: int, file: UploadFile):
        # 1. Busca o passo
        passo_atual = await self.repo.get_execucao_passo(passo_id)
        if not passo_atual:
             raise HTTPException(status_code=404, detail="Passo não encontrado")

        # 2. Lógica de tratamento do JSON antigo vs novo
        evidencias_lista = []
        if passo_atual.evidencias:
            try:
                evidencias_lista = json.loads(passo_atual.evidencias)
                if not isinstance(evidencias_lista, list):
                    evidencias_lista = [passo_atual.evidencias]
            except:
                evidencias_lista = [passo_atual.evidencias]

        if len(evidencias_lista) >= 3:
            raise HTTPException(status_code=400, detail="Limite de 3 evidências atingido.")

        # 3. Salvar Arquivo
        os.makedirs("evidencias", exist_ok=True) # Garante que a pasta existe
        extensao = file.filename.split(".")[-1]
        nome_arquivo = f"{uuid.uuid4()}.{extensao}"
        caminho_arquivo = f"evidencias/{nome_arquivo}"
        
        with open(caminho_arquivo, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        url_publica = f"http://localhost:8000/{caminho_arquivo}" # Ajuste conforme seu domínio
        
        # 4. Atualizar no Banco
        evidencias_lista.append(url_publica)
        
        # Reaproveita seu método de update existente!
        dados_update = ExecucaoPassoUpdate(evidencias=json.dumps(evidencias_lista))
        await self.repo.update_passo(passo_id, dados_update)
        
        return {"url": url_publica, "lista_completa": evidencias_lista}