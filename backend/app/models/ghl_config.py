"""GoHighLevel (GHL) configuration model — stores OAuth tokens per department."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models.email_config import encrypt_token, decrypt_token  # noqa: F401 — re-export


class DepartmentGHLConfig(Base):
    __tablename__ = "department_ghl_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    location_id: Mapped[str] = mapped_column(String(100), nullable=False)          # GHL location/sub-account ID
    location_name: Mapped[str] = mapped_column(String(255), nullable=False)        # Sub-account display name
    company_id: Mapped[str] = mapped_column(String(100), nullable=True)            # GHL company ID
    access_token: Mapped[str] = mapped_column(Text, nullable=False)                # encrypted
    refresh_token: Mapped[str] = mapped_column(Text, nullable=False)               # encrypted
    token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    user_id: Mapped[str] = mapped_column(String(100), nullable=True)               # GHL user ID who authorized
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
