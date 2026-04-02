from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "multi-dept-ai-portal"
    app_env: str = "development"
    app_port: int = 8000
    secret_key: str = "change-me-to-a-random-secret-key-at-least-32-chars"
    cors_origins: str = "http://localhost:3000"

    database_url: str = "sqlite+aiosqlite:///./ai_portal.db"

    redis_url: str = "redis://localhost:6379/0"

    anthropic_api_key: str = ""

    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    rate_limit_default: int = 30
    rate_limit_admin: int = 100

    default_admin_email: str = ""
    default_admin_password: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
