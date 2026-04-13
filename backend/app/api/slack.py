"""Slack admin API routes — /api/v1/slack/*

Admin-only endpoints to connect/disconnect department Slack workspaces via OAuth,
plus status endpoints for any authenticated user.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.database import get_db
from app.middleware.auth_middleware import CurrentUser, get_current_user, require_admin
from app.models.slack_config import DepartmentSlackConfig, encrypt_token
from app.services.slack_service import get_slack_auth_url, exchange_slack_code

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/v1/slack", tags=["slack"])


class SlackStatusResponse(BaseModel):
    department: str
    team_name: str
    team_id: str
    is_active: bool
    connected_at: str


def _encode_state(department: str) -> str:
    payload = {"department": department, "type": "slack_oauth"}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def _decode_state(state: str) -> dict:
    try:
        payload = jwt.decode(state, settings.secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "slack_oauth":
            raise ValueError("Invalid state type")
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid state parameter: {e}")


@router.get("/connect/{department}")
async def connect_slack(
    department: str,
    admin: CurrentUser = Depends(require_admin),
):
    """Admin-only: get OAuth authorization URL for connecting a department Slack workspace."""
    if not settings.slack_client_id:
        raise HTTPException(status_code=400, detail="Slack OAuth not configured")

    state = _encode_state(department)
    auth_url = get_slack_auth_url(state)
    return {"auth_url": auth_url}


@router.get("/callback")
async def slack_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """OAuth callback — exchanges code for bot token and stores config."""
    frontend_url = settings.frontend_url

    if error:
        logger.warning("Slack OAuth denied: %s", error)
        return RedirectResponse(url=f"{frontend_url}/admin?slack_error={error}")

    if not code or not state:
        return RedirectResponse(url=f"{frontend_url}/admin?slack_error=Missing+OAuth+parameters")

    try:
        state_data = _decode_state(state)
    except ValueError as e:
        logger.error("Slack bad state: %s", e)
        return RedirectResponse(url=f"{frontend_url}/admin?slack_error=Invalid+state+parameter")

    department = state_data["department"]

    try:
        tokens = await exchange_slack_code(code)
    except Exception as e:
        logger.error("Slack OAuth failed for %s: %s", department, e)
        return RedirectResponse(url=f"{frontend_url}/admin?slack_error=Token+exchange+failed")

    # Upsert — delete existing config for this department, then insert new
    await db.execute(
        delete(DepartmentSlackConfig).where(DepartmentSlackConfig.department == department)
    )

    config = DepartmentSlackConfig(
        department=department,
        team_id=tokens["team_id"],
        team_name=tokens["team_name"],
        bot_token=encrypt_token(tokens["bot_token"]),
        bot_user_id=tokens["bot_user_id"],
        is_active=True,
    )
    db.add(config)
    await db.commit()

    logger.info("Slack connected for %s: workspace=%s", department, tokens["team_name"])

    return RedirectResponse(url=f"{frontend_url}/admin?slack_connected={department}")


@router.get("/status/{department}", response_model=SlackStatusResponse)
async def slack_status(
    department: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get Slack connection status for a department."""
    result = await db.execute(
        select(DepartmentSlackConfig).where(DepartmentSlackConfig.department == department)
    )
    config = result.scalar_one_or_none()
    if config is None:
        raise HTTPException(status_code=404, detail=f"No Slack connection for {department}")

    return SlackStatusResponse(
        department=config.department,
        team_name=config.team_name,
        team_id=config.team_id,
        is_active=config.is_active,
        connected_at=config.connected_at.isoformat(),
    )


@router.get("/status")
async def all_slack_status(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get Slack connection status for all departments."""
    result = await db.execute(select(DepartmentSlackConfig))
    configs = result.scalars().all()
    return [
        SlackStatusResponse(
            department=c.department,
            team_name=c.team_name,
            team_id=c.team_id,
            is_active=c.is_active,
            connected_at=c.connected_at.isoformat(),
        )
        for c in configs
    ]


@router.delete("/disconnect/{department}")
async def disconnect_slack(
    department: str,
    admin: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: disconnect Slack workspace from a department."""
    result = await db.execute(
        delete(DepartmentSlackConfig).where(DepartmentSlackConfig.department == department)
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"No Slack connection for {department}")
    return {"status": "disconnected", "department": department}
