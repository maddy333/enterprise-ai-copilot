from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "Enterprise AI Copilot"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # Postgres
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: int = 5432
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Redis Cache/Broker
    REDIS_HOST: str
    REDIS_PORT: int = 6379
    
    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    # Vector DB
    QDRANT_HOST: str
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    QDRANT_PORT: int = 6333
    
    # LLM Settings
    LLM_PROVIDER: str = "gemini" # gemini, openai, vllm
    GEMINI_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    VLLM_API_URL: Optional[str] = None
    VLLM_API_KEY: Optional[str] = None
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-large-en-v1.5"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
