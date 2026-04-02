import uuid
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, func, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    department: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    tool_calls_count: Mapped[int] = mapped_column(Integer, default=0)
    model: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_usage_dept_date", "department", "created_at"),
        Index("ix_usage_user_date", "user_id", "created_at"),
    )


class DepartmentBudget(Base):
    __tablename__ = "department_budgets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    monthly_token_limit: Mapped[int] = mapped_column(Integer, default=2_000_000)
    monthly_tool_call_limit: Mapped[int] = mapped_column(Integer, default=5_000)
    max_concurrent_users: Mapped[int] = mapped_column(Integer, default=50)
    alert_threshold_pct: Mapped[int] = mapped_column(Integer, default=75)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
