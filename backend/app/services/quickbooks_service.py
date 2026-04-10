"""QuickBooks service — OAuth flow, token management, and QuickBooks API operations."""

import base64
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.quickbooks_config import DepartmentQuickBooksConfig, encrypt_token, decrypt_token

logger = logging.getLogger(__name__)

QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2"
QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
QB_SANDBOX_BASE = "https://sandbox-quickbooks.api.intuit.com"
QB_PRODUCTION_BASE = "https://quickbooks.api.intuit.com"
QB_SCOPES = "com.intuit.quickbooks.accounting"


def get_quickbooks_auth_url(state: str) -> str:
    settings = get_settings()
    params = {
        "client_id": settings.quickbooks_client_id,
        "response_type": "code",
        "scope": QB_SCOPES,
        "redirect_uri": settings.quickbooks_redirect_uri,
        "state": state,
    }
    return f"{QB_AUTH_URL}?{'&'.join(f'{k}={v}' for k, v in params.items())}"


def _auth_header() -> str:
    settings = get_settings()
    return base64.b64encode(
        f"{settings.quickbooks_client_id}:{settings.quickbooks_client_secret}".encode()
    ).decode()


async def exchange_quickbooks_code(code: str) -> dict[str, Any]:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            QB_TOKEN_URL,
            headers={
                "Authorization": f"Basic {_auth_header()}",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            },
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.quickbooks_redirect_uri,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    return {
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "expires_in": data.get("expires_in", 3600),
    }


async def refresh_quickbooks_token(refresh_token_encrypted: str) -> dict[str, Any]:
    token = decrypt_token(refresh_token_encrypted)
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            QB_TOKEN_URL,
            headers={
                "Authorization": f"Basic {_auth_header()}",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            },
            data={
                "grant_type": "refresh_token",
                "refresh_token": token,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    return {
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "expires_in": data.get("expires_in", 3600),
    }


def _get_base_url() -> str:
    settings = get_settings()
    if settings.quickbooks_environment == "production":
        return QB_PRODUCTION_BASE
    return QB_SANDBOX_BASE


async def _get_valid_token(db: AsyncSession, department: str) -> tuple[str, str]:
    """Get a valid access token for the department, refreshing if needed."""
    result = await db.execute(
        select(DepartmentQuickBooksConfig).where(
            DepartmentQuickBooksConfig.department == department
        )
    )
    config = result.scalar_one_or_none()
    if config is None or not config.is_active:
        raise ValueError(f"QuickBooks not connected for department: {department}")

    # Check if token is expired (with 5 minute buffer)
    if config.token_expires_at:
        expires_at = config.token_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc) + timedelta(minutes=5):
            try:
                tokens = await refresh_quickbooks_token(config.refresh_token)
                config.access_token = encrypt_token(tokens["access_token"])
                config.refresh_token = encrypt_token(tokens["refresh_token"])
                config.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=tokens["expires_in"])
                await db.commit()
                return tokens["access_token"], config.realm_id
            except Exception as e:
                logger.error("Failed to refresh QuickBooks token for %s: %s", department, e)
                raise ValueError(f"QuickBooks token refresh failed: {e}")

    return decrypt_token(config.access_token), config.realm_id


async def quickbooks_api_request(
    db: AsyncSession,
    department: str,
    method: str,
    endpoint: str,
    params: dict | None = None,
    json_data: dict | None = None,
) -> dict[str, Any]:
    """Make an authenticated request to QuickBooks API."""
    access_token, realm_id = await _get_valid_token(db, department)
    base_url = _get_base_url()
    url = f"{base_url}/v3/company/{realm_id}/{endpoint}"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.request(method, url, headers=headers, params=params, json=json_data)
        resp.raise_for_status()
        return resp.json()


async def quickbooks_query(db: AsyncSession, department: str, query_string: str) -> dict[str, Any]:
    """Run a QuickBooks query."""
    return await quickbooks_api_request(db, department, "GET", "query", params={"query": query_string})


# ── High-level convenience functions ──

async def list_customers(db: AsyncSession, department: str, where: str | None = None, max_results: int = 100) -> dict:
    q = f"SELECT * FROM Customer MAXRESULTS {max_results}"
    if where:
        q = f"SELECT * FROM Customer WHERE {where} MAXRESULTS {max_results}"
    return await quickbooks_query(db, department, q)


async def get_customer(db: AsyncSession, department: str, customer_id: str) -> dict:
    return await quickbooks_api_request(db, department, "GET", f"customer/{customer_id}")


async def create_customer(db: AsyncSession, department: str, data: dict) -> dict:
    return await quickbooks_api_request(db, department, "POST", "customer", json_data=data)


async def list_invoices(db: AsyncSession, department: str, where: str | None = None, max_results: int = 100) -> dict:
    q = f"SELECT * FROM Invoice MAXRESULTS {max_results}"
    if where:
        q = f"SELECT * FROM Invoice WHERE {where} MAXRESULTS {max_results}"
    return await quickbooks_query(db, department, q)


async def get_invoice(db: AsyncSession, department: str, invoice_id: str) -> dict:
    return await quickbooks_api_request(db, department, "GET", f"invoice/{invoice_id}")


async def create_invoice(db: AsyncSession, department: str, data: dict) -> dict:
    return await quickbooks_api_request(db, department, "POST", "invoice", json_data=data)


async def list_vendors(db: AsyncSession, department: str, where: str | None = None, max_results: int = 100) -> dict:
    q = f"SELECT * FROM Vendor MAXRESULTS {max_results}"
    if where:
        q = f"SELECT * FROM Vendor WHERE {where} MAXRESULTS {max_results}"
    return await quickbooks_query(db, department, q)


async def list_accounts(db: AsyncSession, department: str, where: str | None = None, max_results: int = 100) -> dict:
    q = f"SELECT * FROM Account MAXRESULTS {max_results}"
    if where:
        q = f"SELECT * FROM Account WHERE {where} MAXRESULTS {max_results}"
    return await quickbooks_query(db, department, q)


async def list_items(db: AsyncSession, department: str, where: str | None = None, max_results: int = 100) -> dict:
    q = f"SELECT * FROM Item MAXRESULTS {max_results}"
    if where:
        q = f"SELECT * FROM Item WHERE {where} MAXRESULTS {max_results}"
    return await quickbooks_query(db, department, q)


async def get_report(db: AsyncSession, department: str, report_name: str, params: dict | None = None) -> dict:
    return await quickbooks_api_request(db, department, "GET", f"reports/{report_name}", params=params)


async def get_company_info(db: AsyncSession, department: str) -> dict:
    return await quickbooks_query(db, department, "SELECT * FROM CompanyInfo")
