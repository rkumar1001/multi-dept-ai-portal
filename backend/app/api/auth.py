"""Authentication API routes — /api/v1/auth/*"""

import time
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.middleware.auth_middleware import CurrentUser, get_current_user
from app.models.user import Department, Role
from app.services.auth_service import authenticate_user, create_access_token, create_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# In-memory store to track failed login attempts per email
# Structure: { "email@example.com": {"count": 3, "blocked_until": 1234567890} }
_failed_attempts: dict = {}

MAX_ATTEMPTS = 5          # block after 5 failed tries
BLOCK_DURATION = 300      # blocked for 5 minutes (300 seconds)


def check_rate_limit(email: str) -> None:
    """Raise 429 if email is currently blocked. Called before every login attempt."""
    record = _failed_attempts.get(email)
    if record is None:
        return  # no previous failures, allow

    # If blocked and block time has not expired yet
    if record["blocked_until"] and time.time() < record["blocked_until"]:
        remaining = int(record["blocked_until"] - time.time())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed attempts. Try again in {remaining} seconds.",
        )

    # Block expired — reset the record so they can try again
    if record["blocked_until"] and time.time() >= record["blocked_until"]:
        _failed_attempts.pop(email, None)


def record_failed_attempt(email: str) -> None:
    """Increment failed attempt counter. Block the email after MAX_ATTEMPTS."""
    record = _failed_attempts.setdefault(email, {"count": 0, "blocked_until": None})
    record["count"] += 1

    if record["count"] >= MAX_ATTEMPTS:
        record["blocked_until"] = time.time() + BLOCK_DURATION  # block for 5 min


def reset_attempts(email: str) -> None:
    """Clear failed attempts on successful login."""
    _failed_attempts.pop(email, None)


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    department: Department


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    department: str
    role: str
    full_name: str


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Step 1: check if this email is currently blocked due to too many failed attempts
    check_rate_limit(body.email)

    # Step 2: verify email and password against DB
    user = await authenticate_user(db, body.email, body.password)
    if user is None:
        # Wrong password — record this failure, block after 5 tries
        record_failed_attempt(body.email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Step 3: login successful — clear any previous failed attempts
    reset_attempts(body.email)

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
        user = await create_user(db, body.email, body.password, body.full_name, body.department, Role.USER)
    except Exception:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    token = create_access_token(str(user.id), user.department.value, user.role.value)
    return TokenResponse(
        access_token=token,
        department=user.department.value,
        role=user.role.value,
        full_name=user.full_name,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    current_user: CurrentUser = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
):
    """Revoke the current access token."""
    pass
