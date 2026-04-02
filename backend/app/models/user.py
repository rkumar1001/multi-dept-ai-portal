import enum
import uuid
from datetime import datetime

from sqlalchemy import String, Enum, DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Department(str, enum.Enum):
    SALES = "sales"
    FINANCE = "finance"
    ACCOUNTING = "accounting"
    RESTAURANT = "restaurant"
    LOGISTICS = "logistics"


class Role(str, enum.Enum):
    USER = "user"
    DEPT_ADMIN = "dept_admin"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[Department] = mapped_column(Enum(Department), nullable=False, index=True)
    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False, default=Role.USER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
