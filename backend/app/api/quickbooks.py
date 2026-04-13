"""QuickBooks admin API routes — /api/v1/quickbooks/*

Admin-only endpoints to connect/disconnect department QuickBooks accounts via OAuth,
plus status endpoints for any authenticated user.
"""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.database import get_db
from app.middleware.auth_middleware import CurrentUser, get_current_user, require_admin
from app.models.quickbooks_config import DepartmentQuickBooksConfig, encrypt_token
from app.services.quickbooks_service import (
    get_quickbooks_auth_url,
    exchange_quickbooks_code,
    get_company_info,
)

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/v1/quickbooks", tags=["quickbooks"])


class QuickBooksStatusResponse(BaseModel):
    department: str
    realm_id: str
    company_name: str | None
    is_active: bool
    connected_at: str


def _encode_state(department: str) -> str:
    payload = {"department": department, "type": "quickbooks_oauth"}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def _decode_state(state: str) -> dict:
    try:
        payload = jwt.decode(state, settings.secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "quickbooks_oauth":
            raise ValueError("Invalid state type")
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid state parameter: {e}")


@router.get("/connect/{department}")
async def connect_quickbooks(
    department: str,
    admin: CurrentUser = Depends(require_admin),
):
    """Admin-only: get OAuth authorization URL for connecting a department to QuickBooks."""
    if not settings.quickbooks_client_id:
        raise HTTPException(status_code=400, detail="QuickBooks OAuth not configured")

    state = _encode_state(department)
    auth_url = get_quickbooks_auth_url(state)
    return {"auth_url": auth_url}


@router.get("/callback")
async def quickbooks_callback(
    code: str = Query(None),
    state: str = Query(None),
    realmId: str = Query(None),
    error: str = Query(None),
    error_description: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """OAuth callback — exchanges code for tokens and stores config."""
    frontend_url = settings.frontend_url

    # Intuit may return error param if user denies access
    if error:
        msg = error_description or error
        logger.warning("QuickBooks OAuth denied: %s", msg)
        return RedirectResponse(url=f"{frontend_url}/admin?quickbooks_error={msg}")

    if not code or not state or not realmId:
        return RedirectResponse(url=f"{frontend_url}/admin?quickbooks_error=Missing+OAuth+parameters")

    try:
        state_data = _decode_state(state)
    except ValueError as e:
        logger.error("QuickBooks bad state: %s", e)
        return RedirectResponse(url=f"{frontend_url}/admin?quickbooks_error=Invalid+state+parameter")

    department = state_data["department"]

    try:
        tokens = await exchange_quickbooks_code(code)
    except Exception as e:
        logger.error("QuickBooks token exchange failed for %s: %s", department, e)
        return RedirectResponse(url=f"{frontend_url}/admin?quickbooks_error=Token+exchange+failed")

    # Upsert — delete existing config for this department, then insert new
    await db.execute(
        delete(DepartmentQuickBooksConfig).where(DepartmentQuickBooksConfig.department == department)
    )

    config = DepartmentQuickBooksConfig(
        department=department,
        realm_id=realmId,
        company_name=None,  # Will be fetched on first use
        access_token=encrypt_token(tokens["access_token"]),
        refresh_token=encrypt_token(tokens["refresh_token"]),
        token_expires_at=datetime.now(timezone.utc) + timedelta(seconds=tokens["expires_in"]),
        is_active=True,
    )
    db.add(config)
    await db.commit()

    logger.info("QuickBooks connected for %s: realmId=%s", department, realmId)

    return RedirectResponse(url=f"{frontend_url}/admin?quickbooks_connected={department}")


@router.get("/status/{department}", response_model=QuickBooksStatusResponse)
async def quickbooks_status(
    department: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get QuickBooks connection status for a department."""
    result = await db.execute(
        select(DepartmentQuickBooksConfig).where(DepartmentQuickBooksConfig.department == department)
    )
    config = result.scalar_one_or_none()
    if config is None:
        raise HTTPException(status_code=404, detail=f"No QuickBooks connection for {department}")

    return QuickBooksStatusResponse(
        department=config.department,
        realm_id=config.realm_id,
        company_name=config.company_name,
        is_active=config.is_active,
        connected_at=config.connected_at.isoformat(),
    )


@router.get("/status")
async def all_quickbooks_status(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get QuickBooks connection status for all departments."""
    result = await db.execute(select(DepartmentQuickBooksConfig))
    configs = result.scalars().all()
    return [
        QuickBooksStatusResponse(
            department=c.department,
            realm_id=c.realm_id,
            company_name=c.company_name,
            is_active=c.is_active,
            connected_at=c.connected_at.isoformat(),
        )
        for c in configs
    ]


@router.delete("/disconnect/{department}")
async def disconnect_quickbooks(
    department: str,
    admin: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: disconnect QuickBooks from a department."""
    result = await db.execute(
        delete(DepartmentQuickBooksConfig).where(DepartmentQuickBooksConfig.department == department)
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"No QuickBooks connection for {department}")
    return {"status": "disconnected", "department": department}
