from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=(settings.app_env == "development"))
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    # Import all models so Base.metadata knows about their tables
    import app.models.user  # noqa: F401
    import app.models.conversation  # noqa: F401
    import app.models.usage  # noqa: F401
    import app.models.email_config  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _seed_default_admin()


async def _seed_default_admin():
    if not settings.default_admin_email or not settings.default_admin_password:
        return
    from app.models.user import User, Department, Role
    from app.services.auth_service import hash_password
    import uuid

    seed_users = [
        {"email": "admin@gmail.com", "password": "admin", "full_name": "Restaurant Admin", "department": Department.RESTAURANT, "role": Role.ADMIN},
        {"email": "admin1@gmail.com", "password": "admin", "full_name": "Logistics Admin", "department": Department.LOGISTICS, "role": Role.ADMIN},
        {"email": "themasalatwist@gmail.com", "password": "oxnard", "full_name": "The Masala Twist", "department": Department.RESTAURANT, "role": Role.USER},
        {"email": "finance@demo.com", "password": "admin", "full_name": "Finance Admin", "department": Department.FINANCE, "role": Role.ADMIN},
        {"email": "accounting@demo.com", "password": "admin", "full_name": "Accounting Admin", "department": Department.ACCOUNTING, "role": Role.ADMIN},
        {"email": "sales@demo.com", "password": "admin", "full_name": "Sales Admin", "department": Department.SALES, "role": Role.ADMIN},
    ]

    async with async_session() as session:
        for u in seed_users:
            result = await session.execute(select(User).where(User.email == u["email"]))
            existing = result.scalar_one_or_none()
            if existing:
                # Fix role / password on every boot so they stay correct
                existing.hashed_password = hash_password(u["password"])
                existing.role = u["role"]
                existing.department = u["department"]
            else:
                session.add(User(
                    id=str(uuid.uuid4()),
                    email=u["email"],
                    hashed_password=hash_password(u["password"]),
                    full_name=u["full_name"],
                    department=u["department"],
                    role=u["role"],
                ))

        await session.commit()
