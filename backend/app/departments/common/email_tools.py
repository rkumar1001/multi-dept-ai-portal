"""Shared email tools available to all departments.

Provides 6 Claude tool definitions and a dispatcher that routes calls
through the email service using the department's connected account.
"""

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.email_service import (
    get_valid_token,
    gmail_search, gmail_get_message, gmail_send, gmail_reply, gmail_create_draft, gmail_list_labels,
    outlook_search, outlook_get_message, outlook_send, outlook_reply, outlook_create_draft, outlook_list_folders,
)

logger = logging.getLogger(__name__)

EMAIL_TOOLS: list[dict] = [
    {
        "name": "search_emails",
        "description": "Search the department's email inbox. Returns matching emails with subject, sender, date, and preview.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query (e.g., 'from:john invoice', 'subject:meeting')"},
                "max_results": {"type": "integer", "description": "Maximum emails to return (default 10, max 25)", "default": 10},
            },
            "required": ["query"],
        },
    },
    {
        "name": "read_email",
        "description": "Read the full content of a specific email by its message ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "message_id": {"type": "string", "description": "The email message ID (from search results)"},
            },
            "required": ["message_id"],
        },
    },
    {
        "name": "send_email",
        "description": "Send an email from the department's email account. Always confirm details with the user before sending.",
        "input_schema": {
            "type": "object",
            "properties": {
                "to": {"type": "string", "description": "Recipient email address(es), comma-separated"},
                "subject": {"type": "string", "description": "Email subject line"},
                "body": {"type": "string", "description": "Email body (plain text)"},
                "cc": {"type": "string", "description": "CC recipients, comma-separated", "default": ""},
                "bcc": {"type": "string", "description": "BCC recipients, comma-separated", "default": ""},
            },
            "required": ["to", "subject", "body"],
        },
    },
    {
        "name": "reply_to_email",
        "description": "Reply to an email thread. Always confirm the reply content with the user before sending.",
        "input_schema": {
            "type": "object",
            "properties": {
                "message_id": {"type": "string", "description": "The message ID to reply to"},
                "body": {"type": "string", "description": "Reply body (plain text)"},
            },
            "required": ["message_id", "body"],
        },
    },
    {
        "name": "create_draft",
        "description": "Create an email draft in the department's email account without sending it.",
        "input_schema": {
            "type": "object",
            "properties": {
                "to": {"type": "string", "description": "Recipient email address(es), comma-separated"},
                "subject": {"type": "string", "description": "Email subject line"},
                "body": {"type": "string", "description": "Email body (plain text)"},
            },
            "required": ["to", "subject", "body"],
        },
    },
    {
        "name": "list_email_folders",
        "description": "List available email folders/labels in the department's email account.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
]

EMAIL_TOOL_NAMES = {t["name"] for t in EMAIL_TOOLS}


def is_email_tool(tool_name: str) -> bool:
    return tool_name in EMAIL_TOOL_NAMES


async def execute_email_tool(
    tool_name: str,
    tool_input: dict[str, Any],
    department: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """Execute an email tool call for the given department."""
    try:
        token, config = await get_valid_token(db, department)
    except ValueError as e:
        return {"error": str(e)}
    except Exception as e:
        logger.error("Failed to get email token for %s: %s", department, e)
        return {"error": "Failed to access department email. The connection may need to be re-established by an admin."}

    provider = config.provider

    try:
        if tool_name == "search_emails":
            max_results = min(tool_input.get("max_results", 10), 25)
            if provider == "gmail":
                results = await gmail_search(token, tool_input["query"], max_results)
            else:
                results = await outlook_search(token, tool_input["query"], max_results)
            return {"emails": results, "count": len(results), "provider": provider}

        elif tool_name == "read_email":
            if provider == "gmail":
                msg = await gmail_get_message(token, tool_input["message_id"])
            else:
                msg = await outlook_get_message(token, tool_input["message_id"])
            return {"email": msg, "provider": provider}

        elif tool_name == "send_email":
            if provider == "gmail":
                result = await gmail_send(
                    token, tool_input["to"], tool_input["subject"], tool_input["body"],
                    cc=tool_input.get("cc", ""), bcc=tool_input.get("bcc", ""),
                )
            else:
                result = await outlook_send(
                    token, tool_input["to"], tool_input["subject"], tool_input["body"],
                    cc=tool_input.get("cc", ""), bcc=tool_input.get("bcc", ""),
                )
            return {**result, "from": config.email_address, "provider": provider}

        elif tool_name == "reply_to_email":
            if provider == "gmail":
                result = await gmail_reply(token, tool_input["message_id"], tool_input["body"])
            else:
                result = await outlook_reply(token, tool_input["message_id"], tool_input["body"])
            return {**result, "from": config.email_address, "provider": provider}

        elif tool_name == "create_draft":
            if provider == "gmail":
                result = await gmail_create_draft(token, tool_input["to"], tool_input["subject"], tool_input["body"])
            else:
                result = await outlook_create_draft(token, tool_input["to"], tool_input["subject"], tool_input["body"])
            return {**result, "provider": provider}

        elif tool_name == "list_email_folders":
            if provider == "gmail":
                folders = await gmail_list_labels(token)
            else:
                folders = await outlook_list_folders(token)
            return {"folders": folders, "provider": provider}

        else:
            return {"error": f"Unknown email tool: {tool_name}"}

    except Exception as e:
        logger.error("Email tool %s failed for %s: %s", tool_name, department, e)
        return {"error": f"Email operation failed: {e}"}
