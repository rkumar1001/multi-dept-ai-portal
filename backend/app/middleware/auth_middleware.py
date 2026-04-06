import logging
import uuid
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import Role
from app.services.auth_service import decode_access_token, get_user_by_id
from app.services.redis_service import is_token_blacklisted

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer()


@dataclass
class CurrentUser:
    id: str
    department: str
    role: str


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    # Check token blacklist (logout support) — fail open if Redis is down
    jti = payload.get("jti")
    if jti:
        try:
            if await is_token_blacklisted(jti):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")
        except HTTPException:
            raise
        except Exception:
            logger.warning("Redis unavailable for token blacklist check, allowing request")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = await get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return CurrentUser(id=user.id, department=user.department.value, role=user.role.value)


async def require_admin(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
