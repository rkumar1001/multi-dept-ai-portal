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
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _seed_default_admin()


async def _seed_default_admin():
    if not settings.default_admin_email or not settings.default_admin_password:
        return
    from app.models.user import User, Department, Role
    from app.services.auth_service import hash_password
    import uuid

    async with async_session() as session:
        # Seed admin@gmail.com as restaurant admin
        result = await session.execute(select(User).where(User.email == "admin@gmail.com"))
        if not result.scalar_one_or_none():
            restaurant_admin = User(
                id=str(uuid.uuid4()),
                email="admin@gmail.com",
                hashed_password=hash_password(settings.default_admin_password),
                full_name="Restaurant Admin",
                department=Department.RESTAURANT,
                role=Role.ADMIN,
            )
            session.add(restaurant_admin)

        # Seed admin1@gmail.com as logistics admin
        result = await session.execute(select(User).where(User.email == "admin1@gmail.com"))
        if not result.scalar_one_or_none():
            logistics_admin = User(
                id=str(uuid.uuid4()),
                email="admin1@gmail.com",
                hashed_password=hash_password(settings.default_admin_password),
                full_name="Logistics Admin",
                department=Department.LOGISTICS,
                role=Role.ADMIN,
            )
            session.add(logistics_admin)

        # Seed The Masala Twist restaurant user
        result = await session.execute(select(User).where(User.email == "themasalatwist@gmail.com"))
        if not result.scalar_one_or_none():
            restaurant_user = User(
                id=str(uuid.uuid4()),
                email="themasalatwist@gmail.com",
                hashed_password=hash_password("oxnard"),
                full_name="The Masala Twist",
                department=Department.RESTAURANT,
                role=Role.USER,
            )
            session.add(restaurant_user)

        await session.commit()
