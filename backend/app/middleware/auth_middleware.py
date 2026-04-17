import uuid
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import Role
from app.services.auth_service import decode_access_token, get_user_by_id

# Extracts Bearer token from Authorization header on every request
bearer_scheme = HTTPBearer()

@dataclass
class CurrentUser:
    id: str
    department: str
    role: str


# Runs before every protected route
# Step 1: decode JWT token
# Step 2: extract user ID from token
# Step 3: load user from DB and check if active
# Returns CurrentUser if everything is valid, otherwise raises 401
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    # Decode and verify JWT — returns None if token is fake, expired, or tampered
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    # "sub" field inside JWT holds the user ID
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    # Check user exists in DB and account is not disabled
    user = await get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    # Store .value (plain string) so comparisons like role == "admin" always work safely
    return CurrentUser(id=user.id, department=user.department.value, role=user.role.value)


# Admin-only guard — used on top of get_current_user for admin routes
# Compares role as string vs string to avoid Enum vs string mismatch bug
async def require_admin(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if current_user.role != Role.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user

