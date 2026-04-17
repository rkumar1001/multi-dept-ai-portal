"""Email service — OAuth flows, token management, and email operations for Gmail & Outlook."""

import base64
import logging
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from typing import Any

import httpx
from sqlalchemy import select
# Solves "RuntimeError: Event loop is closed" in some environments (e.g. Windows with certain Python versions) 
_HTTP_TIMEOUT = httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0)
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.email_config import DepartmentEmailConfig, encrypt_token, decrypt_token

logger = logging.getLogger(__name__)

# ─── OAuth URLs ────────────────────────────────────────────────────────────────

GMAIL_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.email"

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
MS_SCOPES = "Mail.ReadWrite Mail.Send offline_access User.Read"


def _ms_auth_url() -> str:
    settings = get_settings()
    return f"https://login.microsoftonline.com/{settings.microsoft_tenant_id}/oauth2/v2.0"


# ─── OAuth Helpers ─────────────────────────────────────────────────────────────


def get_gmail_auth_url(state: str) -> str:
    settings = get_settings()
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": GMAIL_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{GMAIL_AUTH_URL}?{'&'.join(f'{k}={httpx.QueryParams({k: v})[k]}' for k, v in params.items())}"


def get_outlook_auth_url(state: str) -> str:
    settings = get_settings()
    params = {
        "client_id": settings.microsoft_client_id,
        "redirect_uri": settings.microsoft_redirect_uri,
        "response_type": "code",
        "scope": MS_SCOPES,
        "state": state,
    }
    base = f"{_ms_auth_url()}/authorize"
    return f"{base}?{'&'.join(f'{k}={httpx.QueryParams({k: v})[k]}' for k, v in params.items())}"


async def exchange_gmail_code(code: str) -> dict[str, Any]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(GMAIL_TOKEN_URL, data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
            "grant_type": "authorization_code",
        })
        resp.raise_for_status()
        tokens = resp.json()

        # Get user email
        userinfo = await client.get(GMAIL_USERINFO_URL, headers={"Authorization": f"Bearer {tokens['access_token']}"})
        userinfo.raise_for_status()
        email = userinfo.json().get("email", "")

    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens.get("refresh_token", ""),
        "expires_in": tokens.get("expires_in", 3600),
        "email": email,
        "scopes": GMAIL_SCOPES,
    }


async def exchange_outlook_code(code: str) -> dict[str, Any]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(f"{_ms_auth_url()}/token", data={
            "code": code,
            "client_id": settings.microsoft_client_id,
            "client_secret": settings.microsoft_client_secret,
            "redirect_uri": settings.microsoft_redirect_uri,
            "grant_type": "authorization_code",
            "scope": MS_SCOPES,
        })
        if not resp.is_success:
            logger.error("Microsoft token exchange failed %s: %s", resp.status_code, resp.text)
            resp.raise_for_status()
        tokens = resp.json()

        # Get user email
        userinfo = await client.get(f"{GRAPH_BASE}/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
        userinfo.raise_for_status()
        profile = userinfo.json()
        email = profile.get("mail") or profile.get("userPrincipalName", "")

    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens.get("refresh_token", ""),
        "expires_in": tokens.get("expires_in", 3600),
        "email": email,
        "scopes": MS_SCOPES,
    }


async def _refresh_gmail_token(refresh_token: str) -> dict[str, Any]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(GMAIL_TOKEN_URL, data={
            "refresh_token": refresh_token,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "grant_type": "refresh_token",
        })
        resp.raise_for_status()
        data = resp.json()
    return {"access_token": data["access_token"], "expires_in": data.get("expires_in", 3600)}


async def _refresh_outlook_token(refresh_token: str) -> dict[str, Any]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(f"{_ms_auth_url()}/token", data={
            "refresh_token": refresh_token,
            "client_id": settings.microsoft_client_id,
            "client_secret": settings.microsoft_client_secret,
            "grant_type": "refresh_token",
            "scope": MS_SCOPES,
        })
        resp.raise_for_status()
        data = resp.json()
    return {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token", refresh_token),
        "expires_in": data.get("expires_in", 3600),
    }


# ─── Token Management ─────────────────────────────────────────────────────────


async def get_valid_token(db: AsyncSession, department: str) -> tuple[str, DepartmentEmailConfig]:
    """Return a valid access token for the department, auto-refreshing if needed."""
    result = await db.execute(
        select(DepartmentEmailConfig).where(
            DepartmentEmailConfig.department == department,
            DepartmentEmailConfig.is_active == True,  # noqa: E712
        )
    )
    config = result.scalar_one_or_none()
    if config is None:
        raise ValueError(f"No email account configured for department '{department}'")

    # Check if token is expired (with 5-minute buffer)
    if config.token_expiry:
        expiry = config.token_expiry
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        if expiry < datetime.now(timezone.utc) + timedelta(minutes=5):
            refresh = decrypt_token(config.refresh_token)
            if config.provider == "gmail":
                refreshed = await _refresh_gmail_token(refresh)
                config.access_token = encrypt_token(refreshed["access_token"])
            else:
                refreshed = await _refresh_outlook_token(refresh)
                config.access_token = encrypt_token(refreshed["access_token"])
                if refreshed.get("refresh_token"):
                    config.refresh_token = encrypt_token(refreshed["refresh_token"])

            config.token_expiry = datetime.now(timezone.utc) + timedelta(seconds=refreshed["expires_in"])
            await db.flush()
            logger.info("Refreshed %s token for department %s", config.provider, department)

    return decrypt_token(config.access_token), config


# ─── Gmail Operations ─────────────────────────────────────────────────────────


async def gmail_search(token: str, query: str, max_results: int = 10) -> list[dict]:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(
            "https://www.googleapis.com/gmail/v1/users/me/messages",
            headers={"Authorization": f"Bearer {token}"},
            params={"q": query, "maxResults": max_results},
        )
        resp.raise_for_status()
        messages = resp.json().get("messages", [])

        results = []
        for msg in messages[:max_results]:
            detail = await client.get(
                f"https://www.googleapis.com/gmail/v1/users/me/messages/{msg['id']}",
                headers={"Authorization": f"Bearer {token}"},
                params={"format": "metadata", "metadataHeaders": "Subject,From,Date,To"},
            )
            detail.raise_for_status()
            data = detail.json()
            headers = {h["name"]: h["value"] for h in data.get("payload", {}).get("headers", [])}
            results.append({
                "id": msg["id"],
                "thread_id": data.get("threadId"),
                "subject": headers.get("Subject", "(no subject)"),
                "from": headers.get("From", ""),
                "to": headers.get("To", ""),
                "date": headers.get("Date", ""),
                "snippet": data.get("snippet", ""),
            })
    return results


async def gmail_get_message(token: str, message_id: str) -> dict:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(
            f"https://www.googleapis.com/gmail/v1/users/me/messages/{message_id}",
            headers={"Authorization": f"Bearer {token}"},
            params={"format": "full"},
        )
        resp.raise_for_status()
        data = resp.json()

        headers = {h["name"]: h["value"] for h in data.get("payload", {}).get("headers", [])}
        body = _extract_gmail_body(data.get("payload", {}))
        return {
            "id": message_id,
            "thread_id": data.get("threadId"),
            "subject": headers.get("Subject", "(no subject)"),
            "from": headers.get("From", ""),
            "to": headers.get("To", ""),
            "date": headers.get("Date", ""),
            "body": body,
            "labels": data.get("labelIds", []),
        }


def _extract_gmail_body(payload: dict) -> str:
    """Extract plain text body from Gmail message payload."""
    if payload.get("mimeType") == "text/plain" and payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")
    for part in payload.get("parts", []):
        result = _extract_gmail_body(part)
        if result:
            return result
    return ""


async def gmail_send(token: str, to: str, subject: str, body: str, cc: str = "", bcc: str = "") -> dict:
    msg = MIMEText(body)
    msg["to"] = to
    msg["subject"] = subject
    if cc:
        msg["cc"] = cc
    if bcc:
        msg["bcc"] = bcc
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(
            "https://www.googleapis.com/gmail/v1/users/me/messages/send",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"raw": raw},
        )
        resp.raise_for_status()
        data = resp.json()
    return {"id": data.get("id"), "thread_id": data.get("threadId"), "status": "sent"}


async def gmail_reply(token: str, message_id: str, body: str) -> dict:
    # Get original message for thread ID and headers
    original = await gmail_get_message(token, message_id)
    thread_id = original.get("thread_id")

    msg = MIMEText(body)
    msg["to"] = original["from"]
    msg["subject"] = f"Re: {original['subject']}"
    msg["In-Reply-To"] = message_id
    msg["References"] = message_id
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(
            "https://www.googleapis.com/gmail/v1/users/me/messages/send",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"raw": raw, "threadId": thread_id},
        )
        resp.raise_for_status()
        data = resp.json()
    return {"id": data.get("id"), "thread_id": data.get("threadId"), "status": "sent"}


async def gmail_create_draft(token: str, to: str, subject: str, body: str) -> dict:
    msg = MIMEText(body)
    msg["to"] = to
    msg["subject"] = subject
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(
            "https://www.googleapis.com/gmail/v1/users/me/drafts",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"message": {"raw": raw}},
        )
        resp.raise_for_status()
        data = resp.json()
    return {"draft_id": data.get("id"), "status": "draft_created"}


async def gmail_list_labels(token: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(
            "https://www.googleapis.com/gmail/v1/users/me/labels",
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
    return [{"id": l["id"], "name": l["name"], "type": l.get("type", "")} for l in resp.json().get("labels", [])]


# ─── Outlook (Microsoft Graph) Operations ─────────────────────────────────────


async def outlook_search(token: str, query: str, max_results: int = 10) -> list[dict]:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(
            f"{GRAPH_BASE}/me/messages",
            headers={"Authorization": f"Bearer {token}"},
            params={"$search": f'"{query}"', "$top": max_results, "$select": "id,subject,from,toRecipients,receivedDateTime,bodyPreview,conversationId"},
        )
        resp.raise_for_status()
        messages = resp.json().get("value", [])

    return [{
        "id": m["id"],
        "thread_id": m.get("conversationId"),
        "subject": m.get("subject", "(no subject)"),
        "from": m.get("from", {}).get("emailAddress", {}).get("address", ""),
        "to": ", ".join(r.get("emailAddress", {}).get("address", "") for r in m.get("toRecipients", [])),
        "date": m.get("receivedDateTime", ""),
        "snippet": m.get("bodyPreview", ""),
    } for m in messages]


async def outlook_get_message(token: str, message_id: str) -> dict:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(
            f"{GRAPH_BASE}/me/messages/{message_id}",
            headers={"Authorization": f"Bearer {token}"},
            params={"$select": "id,subject,from,toRecipients,receivedDateTime,body,conversationId,parentFolderId"},
        )
        resp.raise_for_status()
        m = resp.json()

    return {
        "id": m["id"],
        "thread_id": m.get("conversationId"),
        "subject": m.get("subject", "(no subject)"),
        "from": m.get("from", {}).get("emailAddress", {}).get("address", ""),
        "to": ", ".join(r.get("emailAddress", {}).get("address", "") for r in m.get("toRecipients", [])),
        "date": m.get("receivedDateTime", ""),
        "body": m.get("body", {}).get("content", ""),
        "folder_id": m.get("parentFolderId"),
    }


async def outlook_send(token: str, to: str, subject: str, body: str, cc: str = "", bcc: str = "") -> dict:
    message: dict[str, Any] = {
        "subject": subject,
        "body": {"contentType": "Text", "content": body},
        "toRecipients": [{"emailAddress": {"address": addr.strip()}} for addr in to.split(",")],
    }
    if cc:
        message["ccRecipients"] = [{"emailAddress": {"address": addr.strip()}} for addr in cc.split(",")]
    if bcc:
        message["bccRecipients"] = [{"emailAddress": {"address": addr.strip()}} for addr in bcc.split(",")]

    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(
            f"{GRAPH_BASE}/me/sendMail",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"message": message, "saveToSentItems": True},
        )
        resp.raise_for_status()
    return {"status": "sent"}


async def outlook_reply(token: str, message_id: str, body: str) -> dict:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(
            f"{GRAPH_BASE}/me/messages/{message_id}/reply",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"comment": body},
        )
        resp.raise_for_status()
    return {"status": "sent"}


async def outlook_create_draft(token: str, to: str, subject: str, body: str) -> dict:
    message = {
        "subject": subject,
        "body": {"contentType": "Text", "content": body},
        "toRecipients": [{"emailAddress": {"address": addr.strip()}} for addr in to.split(",")],
    }
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(
            f"{GRAPH_BASE}/me/messages",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=message,
        )
        resp.raise_for_status()
        data = resp.json()
    return {"draft_id": data.get("id"), "status": "draft_created"}


async def outlook_list_folders(token: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(
            f"{GRAPH_BASE}/me/mailFolders",
            headers={"Authorization": f"Bearer {token}"},
            params={"$top": 50},
        )
        resp.raise_for_status()
    return [{"id": f["id"], "name": f["displayName"], "unread_count": f.get("unreadItemCount", 0)} for f in resp.json().get("value", [])]
