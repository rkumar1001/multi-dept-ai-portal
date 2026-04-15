"""GoHighLevel service — OAuth flow, token management, and GHL API operations."""

import logging
from datetime import datetime, timezone, timedelta
from typing import Any
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.ghl_config import DepartmentGHLConfig, encrypt_token, decrypt_token

logger = logging.getLogger(__name__)

# Sandbox uses the LeadConnector marketplace; production uses the GHL marketplace
GHL_AUTH_URL_PRODUCTION = "https://marketplace.gohighlevel.com/oauth/chooselocation"
GHL_AUTH_URL_SANDBOX = "https://marketplace.leadconnectorhq.com/oauth/chooselocation"
GHL_TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token"
GHL_API = "https://services.leadconnectorhq.com"

GHL_SCOPES = (
    "contacts.readonly contacts.write "
    "conversations.readonly conversations.write "
    "conversations/message.readonly conversations/message.write "
    "opportunities.readonly opportunities.write "
    "calendars.readonly calendars/events.readonly "
    "locations.readonly "
    "users.readonly "
    "businesses.readonly"
)


def get_ghl_auth_url(state: str) -> str:
    settings = get_settings()
    auth_url = (
        GHL_AUTH_URL_SANDBOX
        if settings.ghl_environment == "sandbox"
        else GHL_AUTH_URL_PRODUCTION
    )
    params = {
        "response_type": "code",
        "redirect_uri": settings.ghl_redirect_uri,
        "client_id": settings.ghl_client_id,
        "scope": GHL_SCOPES,
        "state": state,
    }
    logger.info("GHL OAuth using %s environment", settings.ghl_environment)
    return f"{auth_url}?{urlencode(params)}"


async def exchange_ghl_code(code: str) -> dict[str, Any]:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GHL_TOKEN_URL,
            data={
                "client_id": settings.ghl_client_id,
                "client_secret": settings.ghl_client_secret,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.ghl_redirect_uri,
                "user_type": "Location",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        data = resp.json()

    if "error" in data:
        raise ValueError(f"GHL OAuth error: {data.get('error_description', data['error'])}")

    access_token = data["access_token"]
    expires_in = data.get("expires_in", 86400)
    token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # Fetch location info
    location_id = data.get("locationId", "")
    company_id = data.get("companyId", "")
    user_id = data.get("userId", "")
    location_name = location_id  # fallback

    if location_id:
        try:
            async with httpx.AsyncClient() as client:
                loc_resp = await client.get(
                    f"{GHL_API}/locations/{location_id}",
                    headers={"Authorization": f"Bearer {access_token}", "Version": "2021-07-28"},
                )
                if loc_resp.status_code == 200:
                    loc_data = loc_resp.json()
                    location_name = loc_data.get("location", {}).get("name", location_id)
        except Exception as e:
            logger.warning("Could not fetch GHL location name: %s", e)

    return {
        "access_token": access_token,
        "refresh_token": data.get("refresh_token", ""),
        "token_expires_at": token_expires_at,
        "location_id": location_id,
        "location_name": location_name,
        "company_id": company_id,
        "user_id": user_id,
    }


async def _refresh_ghl_token(config: DepartmentGHLConfig, db: AsyncSession) -> str:
    """Refresh expired GHL access token. Updates config in DB."""
    settings = get_settings()
    refresh_token = decrypt_token(config.refresh_token)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GHL_TOKEN_URL,
            data={
                "client_id": settings.ghl_client_id,
                "client_secret": settings.ghl_client_secret,
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "redirect_uri": settings.ghl_redirect_uri,
                "user_type": "Location",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        data = resp.json()

    if "error" in data:
        raise ValueError(f"GHL token refresh failed: {data.get('error_description', data['error'])}")

    new_access = data["access_token"]
    expires_in = data.get("expires_in", 86400)

    config.access_token = encrypt_token(new_access)
    if data.get("refresh_token"):
        config.refresh_token = encrypt_token(data["refresh_token"])
    config.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    await db.commit()
    logger.info("GHL token refreshed for department=%s", config.department)
    return new_access


async def get_valid_token(db: AsyncSession, department: str) -> tuple[str, DepartmentGHLConfig]:
    """Return a valid (possibly refreshed) GHL access token for the department."""
    result = await db.execute(
        select(DepartmentGHLConfig).where(
            DepartmentGHLConfig.department == department,
            DepartmentGHLConfig.is_active.is_(True),
        )
    )
    config = result.scalar_one_or_none()
    if config is None:
        raise ValueError(
            f"No GoHighLevel account connected for {department}. "
            "An admin can connect one from the admin panel."
        )

    # Refresh if expires within 5 minutes
    if config.token_expires_at:
        buffer = timedelta(minutes=5)
        if datetime.now(timezone.utc) + buffer >= config.token_expires_at:
            try:
                access_token = await _refresh_ghl_token(config, db)
                return access_token, config
            except Exception as e:
                logger.error("GHL token refresh failed for %s: %s", department, e)
                raise ValueError("GHL token expired and refresh failed. Please reconnect from the admin panel.")

    return decrypt_token(config.access_token), config


async def _ghl_get(token: str, path: str, params: dict | None = None, version: str = "2021-07-28") -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GHL_API}{path}",
            headers={"Authorization": f"Bearer {token}", "Version": version},
            params=params or {},
        )
        resp.raise_for_status()
        return resp.json()


async def _ghl_post(token: str, path: str, json_body: dict, version: str = "2021-07-28") -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{GHL_API}{path}",
            headers={"Authorization": f"Bearer {token}", "Version": version, "Content-Type": "application/json"},
            json=json_body,
        )
        resp.raise_for_status()
        return resp.json()


async def _ghl_put(token: str, path: str, json_body: dict, version: str = "2021-07-28") -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.put(
            f"{GHL_API}{path}",
            headers={"Authorization": f"Bearer {token}", "Version": version, "Content-Type": "application/json"},
            json=json_body,
        )
        resp.raise_for_status()
        return resp.json()


# ─── Contacts ────────────────────────────────────────────────────────────────

async def search_contacts(token: str, location_id: str, query: str, limit: int = 20) -> list[dict]:
    data = await _ghl_get(token, f"/contacts/search", {
        "locationId": location_id,
        "query": query,
        "limit": min(limit, 100),
    }, version="2021-07-28")
    contacts = data.get("contacts", [])
    return [_format_contact(c) for c in contacts[:limit]]


async def get_contact(token: str, contact_id: str) -> dict:
    data = await _ghl_get(token, f"/contacts/{contact_id}")
    return _format_contact(data.get("contact", data))


async def create_contact(token: str, location_id: str, contact_data: dict) -> dict:
    payload = {"locationId": location_id, **contact_data}
    data = await _ghl_post(token, "/contacts/", payload)
    return _format_contact(data.get("contact", data))


async def update_contact(token: str, contact_id: str, contact_data: dict) -> dict:
    data = await _ghl_put(token, f"/contacts/{contact_id}", contact_data)
    return _format_contact(data.get("contact", data))


def _format_contact(c: dict) -> dict:
    return {
        "id": c.get("id", ""),
        "name": f"{c.get('firstName', '')} {c.get('lastName', '')}".strip(),
        "email": c.get("email", ""),
        "phone": c.get("phone", ""),
        "company": c.get("companyName", ""),
        "tags": c.get("tags", []),
        "source": c.get("source", ""),
        "created_at": c.get("dateAdded", ""),
    }


# ─── Conversations ────────────────────────────────────────────────────────────

async def get_conversations(token: str, location_id: str, limit: int = 20) -> list[dict]:
    data = await _ghl_get(token, "/conversations/search", {
        "locationId": location_id,
        "limit": min(limit, 100),
    }, version="2021-04-15")
    convs = data.get("conversations", [])
    return [
        {
            "id": c.get("id", ""),
            "contact_name": c.get("contactName", ""),
            "last_message": c.get("lastMessageBody", ""),
            "type": c.get("type", ""),
            "unread": c.get("unreadCount", 0),
            "updated_at": c.get("dateUpdated", ""),
        }
        for c in convs[:limit]
    ]


async def send_message(token: str, location_id: str, contact_id: str, message_type: str, message: str) -> dict:
    """Send SMS or Email message via GHL."""
    payload = {
        "type": message_type,  # "SMS" or "Email"
        "contactId": contact_id,
        "message": message,
    }
    data = await _ghl_post(token, "/conversations/messages", payload, version="2021-04-15")
    return {"ok": True, "message_id": data.get("messageId", ""), "conversation_id": data.get("conversationId", "")}


# ─── Opportunities / Pipeline ─────────────────────────────────────────────────

async def get_pipelines(token: str, location_id: str) -> list[dict]:
    data = await _ghl_get(token, "/opportunities/pipelines", {"locationId": location_id})
    pipelines = data.get("pipelines", [])
    return [
        {
            "id": p.get("id", ""),
            "name": p.get("name", ""),
            "stages": [{"id": s.get("id", ""), "name": s.get("name", "")} for s in p.get("stages", [])],
        }
        for p in pipelines
    ]


async def search_opportunities(token: str, location_id: str, pipeline_id: str | None = None, limit: int = 20) -> list[dict]:
    params: dict = {"location_id": location_id, "limit": min(limit, 100)}
    if pipeline_id:
        params["pipeline_id"] = pipeline_id
    data = await _ghl_get(token, "/opportunities/search", params)
    opps = data.get("opportunities", [])
    return [_format_opportunity(o) for o in opps[:limit]]


async def create_opportunity(token: str, location_id: str, opp_data: dict) -> dict:
    payload = {"locationId": location_id, **opp_data}
    data = await _ghl_post(token, "/opportunities/", payload)
    return _format_opportunity(data.get("opportunity", data))


def _format_opportunity(o: dict) -> dict:
    return {
        "id": o.get("id", ""),
        "name": o.get("name", ""),
        "pipeline_id": o.get("pipelineId", ""),
        "pipeline_stage_id": o.get("pipelineStageId", ""),
        "contact_name": o.get("contact", {}).get("name", ""),
        "monetary_value": o.get("monetaryValue", 0),
        "status": o.get("status", ""),
        "assigned_to": o.get("assignedTo", ""),
        "created_at": o.get("createdAt", ""),
    }


# ─── Calendars / Appointments ─────────────────────────────────────────────────

async def get_calendars(token: str, location_id: str) -> list[dict]:
    data = await _ghl_get(token, "/calendars/", {"locationId": location_id})
    return [
        {"id": c.get("id", ""), "name": c.get("name", ""), "description": c.get("description", "")}
        for c in data.get("calendars", [])
    ]


async def get_appointments(token: str, location_id: str, start_time: str, end_time: str, calendar_id: str | None = None) -> list[dict]:
    params: dict = {"locationId": location_id, "startTime": start_time, "endTime": end_time}
    if calendar_id:
        params["calendarId"] = calendar_id
    data = await _ghl_get(token, "/calendars/events", params)
    events = data.get("events", [])
    return [
        {
            "id": e.get("id", ""),
            "title": e.get("title", ""),
            "contact_name": e.get("contact", {}).get("name", ""),
            "start_time": e.get("startTime", ""),
            "end_time": e.get("endTime", ""),
            "status": e.get("appointmentStatus", ""),
            "calendar_id": e.get("calendarId", ""),
        }
        for e in events
    ]
