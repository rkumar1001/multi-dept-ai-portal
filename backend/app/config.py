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
    frontend_url: str = "http://localhost:3000"

    database_url: str = f"sqlite+aiosqlite:///{Path(__file__).resolve().parent.parent / 'ai_portal.db'}"

    anthropic_api_key: str = ""
    claude_model: str = "claude-haiku-4-5"

    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    default_admin_email: str = ""
    default_admin_password: str = ""

    fleethunt_base_url: str = "https://app.fleethunt.ca/api"
    fleethunt_api_key: str = ""

    samsara_api_key: str = ""

    fcm_backend_url: str = ""
    fcm_backend_secret: str = ""

    # Google OAuth (Gmail)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/email/callback/gmail"

    # Microsoft OAuth (Outlook)
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    microsoft_redirect_uri: str = "http://localhost:8000/api/v1/email/callback/outlook"
    microsoft_tenant_id: str = "common"

    # Slack OAuth
    slack_client_id: str = ""
    slack_client_secret: str = ""
    slack_redirect_uri: str = "http://localhost:8000/api/v1/slack/callback"

    # QuickBooks OAuth
    quickbooks_client_id: str = ""
    quickbooks_client_secret: str = ""
    quickbooks_redirect_uri: str = "http://localhost:8000/api/v1/quickbooks/callback"
    quickbooks_environment: str = "sandbox"

    model_config = {"env_file": str(_ENV_FILE), "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
