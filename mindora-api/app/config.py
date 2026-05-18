from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_expires_min: int = 60 * 24 * 7
    openai_api_key: str
    embed_model: str = "text-embedding-3-small"
    embed_dim: int = 1536
    llm_model: str = "gpt-4o-mini"
    allowed_origins: str = "*"
    max_upload_mb: int = 25

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")


settings = Settings()
