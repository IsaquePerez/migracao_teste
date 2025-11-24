from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra='ignore')

    # Variáveis do .env
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int
    POSTGRES_DB: str
    DATABASE_URL: str | None = None
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        url_to_use = self.DATABASE_URL
        
        # Se DATABASE_URL não for fornecida, monta a partir das outras variáveis
        if not url_to_use:
            return (
                f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
                f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )

        # *** A CORREÇÃO ESTÁ AQUI ***
        # Garante que, se a URL já existir, ela seja convertida para o formato asyncpg
        if url_to_use.startswith("postgresql://"):
            return url_to_use.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url_to_use.startswith("postgres://"):
            return url_to_use.replace("postgres://", "postgresql+asyncpg://", 1)
        
        return url_to_use

    # Configurações gerais
    PROJECT_NAME: str = "Projeto GE"
    API_V1_STR: str = "/api/v1"

settings = Settings()