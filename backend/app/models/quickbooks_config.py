"""Department QuickBooks configuration model — stores OAuth tokens for QuickBooks Online."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models.email_config import encrypt_token, decrypt_token  # reuse Fernet helpers


class DepartmentQuickBooksConfig(Base):
    __tablename__ = "department_quickbooks_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    realm_id: Mapped[str] = mapped_column(String(50), nullable=False)              # QuickBooks company ID
    company_name: Mapped[str] = mapped_column(String(255), nullable=True)           # Company display name
    access_token: Mapped[str] = mapped_column(Text, nullable=False)                 # encrypted
    refresh_token: Mapped[str] = mapped_column(Text, nullable=False)                # encrypted
    token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
