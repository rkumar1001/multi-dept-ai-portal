"""Department email configuration model — stores OAuth tokens for department email accounts."""

import uuid
from datetime import datetime

from cryptography.fernet import Fernet
import base64
import hashlib

from sqlalchemy import String, Text, DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.config import get_settings


def _get_fernet() -> Fernet:
    """Derive a Fernet key from the app secret_key."""
    key = hashlib.sha256(get_settings().secret_key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_token(plaintext: str) -> str:
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    return _get_fernet().decrypt(ciphertext.encode()).decode()


class DepartmentEmailConfig(Base):
    __tablename__ = "department_email_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)  # "gmail" or "outlook"
    email_address: Mapped[str] = mapped_column(String(255), nullable=False)
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[str] = mapped_column(Text, nullable=False)
    token_expiry: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scopes: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
