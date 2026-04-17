"""GoHighLevel admin API routes — /api/v1/ghl/*

Admin-only endpoints to connect/disconnect department GHL accounts via OAuth,
plus status endpoints for any authenticated user.
"""

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.database import get_db
from app.middleware.auth_middleware import CurrentUser, get_current_user, require_admin
from app.models.ghl_config import DepartmentGHLConfig, encrypt_token
import httpx
from app.services.ghl_service import get_ghl_auth_url, exchange_ghl_code, GHL_API

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/v1/crm", tags=["ghl"])


class GHLStatusResponse(BaseModel):
    department: str
    location_id: str
    location_name: str
    company_id: str | None
    is_active: bool
    connected_at: str


def _encode_state(department: str) -> str:
    payload = {
        "department": department,
        "type": "ghl_oauth",
        "exp": datetime.utcnow() + timedelta(minutes=5),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def _decode_state(state: str) -> dict:
    try:
        payload = jwt.decode(state, settings.secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "ghl_oauth":
            raise ValueError("Invalid state type")
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid state parameter: {e}")


DEPARTMENTS = ["sales", "finance", "accounting", "restaurant", "logistics"]


@router.post("/setup-api-key")
async def setup_ghl_api_key(
    admin: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: connect all departments using the GHL_API_KEY from .env."""
    settings = get_settings()
    api_key = settings.ghl_api_key
    if not api_key:
        raise HTTPException(status_code=400, detail="GHL_API_KEY not set in .env")

    location_id = settings.ghl_location_id
    if not location_id:
        raise HTTPException(
            status_code=400,
            detail="GHL_LOCATION_ID not set in .env. Find it in your GHL URL: app.gohighlevel.com/v2/location/{YOUR_ID}/..."
        )

    # Try to fetch location name from GHL API
    location_name = location_id
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
            resp = await client.get(
                f"{GHL_API}/locations/{location_id}",
                headers={"Authorization": f"Bearer {api_key}", "Version": "2021-07-28"},
            )
            if resp.is_success:
                data = resp.json()
                location_name = data.get("location", {}).get("name", location_id) or location_id
    except Exception as e:
        logger.warning("Could not fetch GHL location name: %s", e)

    from datetime import datetime, timezone, timedelta
    from app.models.ghl_config import encrypt_token

    # Upsert a config entry for every department
    for dept in DEPARTMENTS:
        await db.execute(
            delete(DepartmentGHLConfig).where(DepartmentGHLConfig.department == dept)
        )
        config = DepartmentGHLConfig(
            department=dept,
            location_id=location_id,
            location_name=location_name,
            company_id=None,
            access_token=encrypt_token(api_key),
            refresh_token=encrypt_token(""),
            token_expires_at=datetime.now(timezone.utc) + timedelta(days=3650),
            user_id=None,
            is_active=True,
        )
        db.add(config)

    await db.commit()
    logger.info("GHL API key setup complete for all departments: location=%s", location_name)
    return {"status": "connected", "location_id": location_id, "location_name": location_name, "departments": DEPARTMENTS}


@router.get("/connect/{department}")
async def connect_ghl(
    department: str,
    admin: CurrentUser = Depends(require_admin),
):
    """Admin-only: get OAuth authorization URL for connecting a department GHL account."""
    if not settings.ghl_client_id:
        raise HTTPException(status_code=400, detail="GoHighLevel OAuth not configured. Add GHL_CLIENT_ID and GHL_CLIENT_SECRET to .env")

    state = _encode_state(department)
    auth_url = get_ghl_auth_url(state)
    return {"auth_url": auth_url}


@router.get("/callback")
async def ghl_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """OAuth callback — exchanges code for access token and stores config."""
    frontend_url = settings.frontend_url

    if error:
        logger.warning("GHL OAuth denied: %s", error)
        return RedirectResponse(url=f"{frontend_url}/admin?ghl_error={error}")

    if not code or not state:
        return RedirectResponse(url=f"{frontend_url}/admin?ghl_error=Missing+OAuth+parameters")

    try:
        state_data = _decode_state(state)
    except ValueError as e:
        logger.error("GHL bad state: %s", e)
        return RedirectResponse(url=f"{frontend_url}/admin?ghl_error=Invalid+state+parameter")

    department = state_data["department"]

    try:
        tokens = await exchange_ghl_code(code)
    except Exception as e:
        logger.error("GHL OAuth failed for %s: %s", department, e)
        return RedirectResponse(url=f"{frontend_url}/admin?ghl_error=Token+exchange+failed")

    # Upsert — remove existing config for this department, insert new
    await db.execute(
        delete(DepartmentGHLConfig).where(DepartmentGHLConfig.department == department)
    )

    config = DepartmentGHLConfig(
        department=department,
        location_id=tokens["location_id"],
        location_name=tokens["location_name"],
        company_id=tokens.get("company_id") or None,
        access_token=encrypt_token(tokens["access_token"]),
        refresh_token=encrypt_token(tokens["refresh_token"]),
        token_expires_at=tokens["token_expires_at"],
        user_id=tokens.get("user_id") or None,
        is_active=True,
    )
    db.add(config)
    await db.commit()

    logger.info("GHL connected for %s: location=%s", department, tokens["location_name"])

    return RedirectResponse(url=f"{frontend_url}/admin?ghl_connected={department}")


@router.get("/status/{department}", response_model=GHLStatusResponse)
async def ghl_status(
    department: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get GHL connection status for a department."""
    result = await db.execute(
        select(DepartmentGHLConfig).where(DepartmentGHLConfig.department == department)
    )
    config = result.scalar_one_or_none()
    if config is None:
        raise HTTPException(status_code=404, detail=f"No GHL connection for {department}")

    return GHLStatusResponse(
        department=config.department,
        location_id=config.location_id,
        location_name=config.location_name,
        company_id=config.company_id,
        is_active=config.is_active,
        connected_at=config.connected_at.isoformat(),
    )


@router.get("/status")
async def all_ghl_status(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get GHL connection status for all departments."""
    result = await db.execute(select(DepartmentGHLConfig))
    configs = result.scalars().all()
    return [
        GHLStatusResponse(
            department=c.department,
            location_id=c.location_id,
            location_name=c.location_name,
            company_id=c.company_id,
            is_active=c.is_active,
            connected_at=c.connected_at.isoformat(),
        )
        for c in configs
    ]


@router.delete("/disconnect/{department}")
async def disconnect_ghl(
    department: str,
    admin: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: disconnect GHL account from a department."""
    result = await db.execute(
        delete(DepartmentGHLConfig).where(DepartmentGHLConfig.department == department)
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"No GHL connection for {department}")
    return {"status": "disconnected", "department": department}
