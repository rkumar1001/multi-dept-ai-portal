from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    app_name: str = "multi-dept-ai-portal"
    app_env: str = "development"
    app_port: int = 8000
    secret_key: str = "change-me-to-a-random-secret-key-at-least-32-chars"
    cors_origins: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002"

    database_url: str = f"sqlite+aiosqlite:///{Path(__file__).resolve().parent.parent / 'ai_portal.db'}"

    redis_url: str = "redis://localhost:6379/0"

    anthropic_api_key: str = ""

    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    rate_limit_default: int = 30
    rate_limit_admin: int = 100

    default_admin_email: str = ""
    default_admin_password: str = ""

    fleethunt_base_url: str = "https://app.fleethunt.ca/api"
    fleethunt_api_key: str = ""

    fcm_backend_url: str = ""
    fcm_backend_secret: str = ""

    model_config = {"env_file": str(_ENV_FILE), "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
