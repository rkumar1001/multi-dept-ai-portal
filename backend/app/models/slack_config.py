"""Department Slack configuration model — stores OAuth tokens for department Slack workspaces."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models.email_config import encrypt_token, decrypt_token  # reuse Fernet helpers


class DepartmentSlackConfig(Base):
    __tablename__ = "department_slack_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    team_id: Mapped[str] = mapped_column(String(50), nullable=False)          # Slack workspace ID
    team_name: Mapped[str] = mapped_column(String(255), nullable=False)        # Workspace display name
    bot_token: Mapped[str] = mapped_column(Text, nullable=False)               # encrypted xoxb-...
    bot_user_id: Mapped[str] = mapped_column(String(50), nullable=False)       # bot's own user ID
    default_channel_id: Mapped[str] = mapped_column(String(50), nullable=True) # optional default channel
    default_channel_name: Mapped[str] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
