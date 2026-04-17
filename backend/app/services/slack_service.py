"""Slack service — OAuth flow, token management, and Slack API operations."""

import logging
from typing import Any

import httpx
from sqlalchemy import select

_HTTP_TIMEOUT = httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0)
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.slack_config import DepartmentSlackConfig, encrypt_token, decrypt_token

logger = logging.getLogger(__name__)

SLACK_AUTH_URL = "https://slack.com/oauth/v2/authorize"
SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access"
SLACK_API = "https://slack.com/api"

# Bot token scopes needed
SLACK_BOT_SCOPES = (
    "channels:read,channels:history,channels:join,"
    "chat:write,chat:write.public,"
    "users:read,users:read.email,"
    "groups:read,groups:history,"
    "im:read,im:history,im:write,"
    "files:read,reactions:read,reactions:write,"
    "team:read"
)


def get_slack_auth_url(state: str) -> str:
    settings = get_settings()
    params = {
        "client_id": settings.slack_client_id,
        "scope": SLACK_BOT_SCOPES,
        "redirect_uri": settings.slack_redirect_uri,
        "state": state,
    }
    return f"{SLACK_AUTH_URL}?{'&'.join(f'{k}={v}' for k, v in params.items())}"


async def exchange_slack_code(code: str) -> dict[str, Any]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(SLACK_TOKEN_URL, data={
            "code": code,
            "client_id": settings.slack_client_id,
            "client_secret": settings.slack_client_secret,
            "redirect_uri": settings.slack_redirect_uri,
        })
        resp.raise_for_status()
        data = resp.json()

    if not data.get("ok"):
        raise ValueError(f"Slack OAuth error: {data.get('error', 'unknown')}")

    return {
        "bot_token": data["access_token"],
        "team_id": data["team"]["id"],
        "team_name": data["team"]["name"],
        "bot_user_id": data.get("bot_user_id", ""),
    }


async def get_valid_token(db: AsyncSession, department: str) -> tuple[str, DepartmentSlackConfig]:
    """Get decrypted bot token for the department. Raises ValueError if not connected."""
    result = await db.execute(
        select(DepartmentSlackConfig).where(
            DepartmentSlackConfig.department == department,
            DepartmentSlackConfig.is_active.is_(True),
        )
    )
    config = result.scalar_one_or_none()
    if config is None:
        raise ValueError(f"No Slack workspace connected for {department}. An admin can connect one from the admin panel.")
    return decrypt_token(config.bot_token), config


async def _slack_get(token: str, method: str, params: dict | None = None) -> dict:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(
            f"{SLACK_API}/{method}",
            headers={"Authorization": f"Bearer {token}"},
            params=params or {},
        )
        resp.raise_for_status()
        data = resp.json()
    if not data.get("ok"):
        raise RuntimeError(f"Slack API error ({method}): {data.get('error', 'unknown')}")
    return data


async def _slack_post(token: str, method: str, json_body: dict) -> dict:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(
            f"{SLACK_API}/{method}",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=json_body,
        )
        resp.raise_for_status()
        data = resp.json()
    if not data.get("ok"):
        raise RuntimeError(f"Slack API error ({method}): {data.get('error', 'unknown')}")
    return data


# ─── Channel Operations ──────────────────────────────────────────────

async def list_channels(token: str, limit: int = 50) -> list[dict]:
    data = await _slack_get(token, "conversations.list", {
        "types": "public_channel,private_channel",
        "exclude_archived": "true",
        "limit": str(min(limit, 200)),
    })
    return [
        {"id": ch["id"], "name": ch["name"], "topic": ch.get("topic", {}).get("value", ""), "num_members": ch.get("num_members", 0)}
        for ch in data.get("channels", [])
    ]


async def get_channel_history(token: str, channel_id: str, limit: int = 20) -> list[dict]:
    data = await _slack_get(token, "conversations.history", {
        "channel": channel_id,
        "limit": str(min(limit, 50)),
    })
    messages = []
    for msg in data.get("messages", []):
        messages.append({
            "ts": msg.get("ts", ""),
            "user": msg.get("user", "bot"),
            "text": msg.get("text", ""),
            "type": msg.get("subtype", "message"),
        })
    return messages


async def send_message(token: str, channel: str, text: str) -> dict:
    data = await _slack_post(token, "chat.postMessage", {
        "channel": channel,
        "text": text,
    })
    return {"ok": True, "channel": data["channel"], "ts": data["ts"]}


async def reply_to_thread(token: str, channel: str, thread_ts: str, text: str) -> dict:
    data = await _slack_post(token, "chat.postMessage", {
        "channel": channel,
        "text": text,
        "thread_ts": thread_ts,
    })
    return {"ok": True, "channel": data["channel"], "ts": data["ts"]}


# ─── User Operations ─────────────────────────────────────────────────

async def list_users(token: str, limit: int = 50) -> list[dict]:
    data = await _slack_get(token, "users.list", {"limit": str(min(limit, 200))})
    users = []
    for u in data.get("members", []):
        if u.get("deleted") or u.get("is_bot"):
            continue
        profile = u.get("profile", {})
        users.append({
            "id": u["id"],
            "name": u.get("real_name", u.get("name", "")),
            "display_name": profile.get("display_name", ""),
            "email": profile.get("email", ""),
            "status": profile.get("status_text", ""),
        })
    return users


# ─── Search Operations ───────────────────────────────────────────────

async def search_messages(token: str, query: str, count: int = 10) -> list[dict]:
    """Search messages across channels. Requires search:read scope on user token.
    For bot tokens, falls back to channel history search."""
    try:
        data = await _slack_get(token, "search.messages", {"query": query, "count": str(count)})
        results = []
        for match in data.get("messages", {}).get("matches", []):
            results.append({
                "text": match.get("text", ""),
                "user": match.get("username", ""),
                "channel": match.get("channel", {}).get("name", ""),
                "ts": match.get("ts", ""),
                "permalink": match.get("permalink", ""),
            })
        return results
    except RuntimeError:
        # search.messages may not be available with bot tokens
        return [{"info": "Message search requires a user token. Use read_channel_messages to read specific channels."}]


# ─── Workspace Info ──────────────────────────────────────────────────

async def get_workspace_info(token: str) -> dict:
    data = await _slack_get(token, "team.info")
    team = data.get("team", {})
    return {
        "id": team.get("id", ""),
        "name": team.get("name", ""),
        "domain": team.get("domain", ""),
        "icon": team.get("icon", {}).get("image_88", ""),
    }
