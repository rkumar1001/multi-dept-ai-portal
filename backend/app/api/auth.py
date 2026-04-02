"""Authentication API routes — /api/v1/auth/*"""

from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import Department, Role
from app.services.auth_service import authenticate_user, create_access_token, create_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    department: Department
    role: Role = Role.USER


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    department: str
    role: str
    full_name: str


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, body.email, body.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(str(user.id), user.department.value, user.role.value)
    return TokenResponse(
        access_token=token,
        department=user.department.value,
        role=user.role.value,
        full_name=user.full_name,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await create_user(db, body.email, body.password, body.full_name, body.department, body.role)
    except Exception:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    token = create_access_token(str(user.id), user.department.value, user.role.value)
    return TokenResponse(
        access_token=token,
        department=user.department.value,
        role=user.role.value,
        full_name=user.full_name,
    )
