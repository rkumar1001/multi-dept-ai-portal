"""Email admin API routes — /api/v1/email/*

Admin-only endpoints to connect/disconnect department email accounts via OAuth,
plus status endpoints for any authenticated user.
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.database import get_db
from app.middleware.auth_middleware import CurrentUser, get_current_user, require_admin
from app.models.email_config import DepartmentEmailConfig, encrypt_token
from app.services.email_service import (
    get_gmail_auth_url,
    get_outlook_auth_url,
    exchange_gmail_code,
    exchange_outlook_code,
)

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/v1/email", tags=["email"])


class EmailStatusResponse(BaseModel):
    department: str
    provider: str
    email_address: str
    is_active: bool
    connected_at: str


def _encode_state(department: str, provider: str) -> str:
    """Encode department + provider into a signed JWT state param."""
    payload = {"department": department, "provider": provider, "type": "email_oauth"}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def _decode_state(state: str) -> dict:
    """Decode and verify the JWT state param."""
    try:
        payload = jwt.decode(state, settings.secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "email_oauth":
            raise ValueError("Invalid state type")
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid state parameter: {e}")


@router.get("/connect/{department}/{provider}")
async def connect_email(
    department: str,
    provider: str,
    admin: CurrentUser = Depends(require_admin),
):
    """Admin-only: get OAuth authorization URL for connecting a department email."""
    if provider not in ("gmail", "outlook"):
        raise HTTPException(status_code=400, detail="Provider must be 'gmail' or 'outlook'")

    state = _encode_state(department, provider)

    if provider == "gmail":
        if not settings.google_client_id:
            raise HTTPException(status_code=400, detail="Google OAuth not configured")
        auth_url = get_gmail_auth_url(state)
    else:
        if not settings.microsoft_client_id:
            raise HTTPException(status_code=400, detail="Microsoft OAuth not configured")
        auth_url = get_outlook_auth_url(state)

    return {"auth_url": auth_url}


@router.get("/callback/{provider}")
async def email_callback(
    provider: str,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """OAuth callback — exchanges code for tokens and stores config. No auth required (state verifies intent)."""
    try:
        state_data = _decode_state(state)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    department = state_data["department"]
    expected_provider = state_data["provider"]
    if provider != expected_provider:
        raise HTTPException(status_code=400, detail="Provider mismatch")

    try:
        if provider == "gmail":
            tokens = await exchange_gmail_code(code)
        else:
            tokens = await exchange_outlook_code(code)
    except Exception as e:
        logger.error("OAuth token exchange failed for %s/%s: %s", department, provider, e)
        raise HTTPException(status_code=400, detail=f"OAuth token exchange failed: {e}")

    token_expiry = datetime.now(timezone.utc) + timedelta(seconds=tokens["expires_in"])

    # Upsert — delete existing config for this department, then insert new
    await db.execute(
        delete(DepartmentEmailConfig).where(DepartmentEmailConfig.department == department)
    )

    config = DepartmentEmailConfig(
        department=department,
        provider=provider,
        email_address=tokens["email"],
        access_token=encrypt_token(tokens["access_token"]),
        refresh_token=encrypt_token(tokens["refresh_token"]),
        token_expiry=token_expiry,
        scopes=tokens["scopes"],
        is_active=True,
    )
    db.add(config)
    await db.flush()

    logger.info("Connected %s email for department %s: %s", provider, department, tokens["email"])

    # Redirect back to the admin page with success indicator
    frontend_url = settings.cors_origins.split(",")[0]
    return RedirectResponse(url=f"{frontend_url}/admin?email_connected={department}")


@router.get("/status/{department}", response_model=EmailStatusResponse)
async def get_email_status(
    department: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get email connection status for a department. Any authenticated user."""
    result = await db.execute(
        select(DepartmentEmailConfig).where(DepartmentEmailConfig.department == department)
    )
    config = result.scalar_one_or_none()
    if config is None:
        raise HTTPException(status_code=404, detail="No email configured for this department")

    return EmailStatusResponse(
        department=config.department,
        provider=config.provider,
        email_address=config.email_address,
        is_active=config.is_active,
        connected_at=config.connected_at.isoformat() if config.connected_at else "",
    )


@router.get("/status")
async def get_all_email_status(
    admin: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: get email status for all departments."""
    result = await db.execute(select(DepartmentEmailConfig))
    configs = result.scalars().all()
    return [
        EmailStatusResponse(
            department=c.department,
            provider=c.provider,
            email_address=c.email_address,
            is_active=c.is_active,
            connected_at=c.connected_at.isoformat() if c.connected_at else "",
        )
        for c in configs
    ]


@router.delete("/disconnect/{department}")
async def disconnect_email(
    department: str,
    admin: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: disconnect (remove) email config for a department."""
    result = await db.execute(
        delete(DepartmentEmailConfig).where(DepartmentEmailConfig.department == department)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="No email configured for this department")

    logger.info("Disconnected email for department %s", department)
    return {"status": "disconnected", "department": department}
