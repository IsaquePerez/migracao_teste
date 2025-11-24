from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings # Importa a nossa instância de configurações

# Cria a engine assíncrona usando a URL que acabámos de montar
engine = create_async_engine(settings.ASYNC_DATABASE_URL, echo=True)

# Cria a fábrica de sessões assíncronas
AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, autocommit=False, autoflush=False
)

# Base para os nossos modelos ORM
Base = declarative_base()

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

# Cria a engine assíncrona
engine = create_async_engine(settings.ASYNC_DATABASE_URL, echo=True)

# Cria a fábrica de sessões assíncronas
# IMPORTANTE: Não passe argumentos extras aqui que não sejam suportados
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

# Dependência para obter a sessão do banco
# IMPORTANTE: Esta função NÃO deve ter argumentos que o FastAPI possa interpretar como Query Params
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()