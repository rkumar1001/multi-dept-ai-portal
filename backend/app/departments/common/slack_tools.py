"""Shared Slack tools available to all departments.

Provides Claude tool definitions and a dispatcher that routes calls
through the Slack service using the department's connected workspace.
"""

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.slack_service import (
    get_valid_token,
    list_channels,
    get_channel_history,
    send_message,
    reply_to_thread,
    list_users,
    search_messages,
    get_workspace_info,
)

logger = logging.getLogger(__name__)

SLACK_TOOLS: list[dict] = [
    {
        "name": "slack_list_channels",
        "description": "List available Slack channels in the department's connected workspace.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Max channels to return (default 50)", "default": 50},
            },
        },
    },
    {
        "name": "slack_read_channel_messages",
        "description": "Read recent messages from a specific Slack channel.",
        "input_schema": {
            "type": "object",
            "properties": {
                "channel_id": {"type": "string", "description": "The Slack channel ID (from slack_list_channels)"},
                "limit": {"type": "integer", "description": "Max messages to return (default 20, max 50)", "default": 20},
            },
            "required": ["channel_id"],
        },
    },
    {
        "name": "slack_send_message",
        "description": "Send a message to a Slack channel. Always confirm the message content with the user before sending.",
        "input_schema": {
            "type": "object",
            "properties": {
                "channel": {"type": "string", "description": "Channel ID or channel name (e.g., #general)"},
                "text": {"type": "string", "description": "The message text to send"},
            },
            "required": ["channel", "text"],
        },
    },
    {
        "name": "slack_reply_to_thread",
        "description": "Reply to a specific message thread in Slack. Always confirm the reply content with the user before sending.",
        "input_schema": {
            "type": "object",
            "properties": {
                "channel": {"type": "string", "description": "Channel ID where the thread is"},
                "thread_ts": {"type": "string", "description": "The timestamp of the parent message (from slack_read_channel_messages)"},
                "text": {"type": "string", "description": "The reply text"},
            },
            "required": ["channel", "thread_ts", "text"],
        },
    },
    {
        "name": "slack_list_users",
        "description": "List users in the department's connected Slack workspace.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Max users to return (default 50)", "default": 50},
            },
        },
    },
    {
        "name": "slack_search_messages",
        "description": "Search for messages across channels in the department's Slack workspace.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query (e.g., 'shipping update', 'from:@john')"},
                "count": {"type": "integer", "description": "Max results (default 10)", "default": 10},
            },
            "required": ["query"],
        },
    },
    {
        "name": "slack_get_workspace_info",
        "description": "Get information about the department's connected Slack workspace.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
]

SLACK_TOOL_NAMES = {t["name"] for t in SLACK_TOOLS}


def is_slack_tool(tool_name: str) -> bool:
    return tool_name in SLACK_TOOL_NAMES


async def execute_slack_tool(
    tool_name: str,
    tool_input: dict[str, Any],
    department: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """Execute a Slack tool call for the given department."""
    try:
        token, config = await get_valid_token(db, department)
    except ValueError as e:
        return {"error": str(e)}
    except Exception as e:
        logger.error("Failed to get Slack token for %s: %s", department, e)
        return {"error": "Failed to access department Slack. The connection may need to be re-established by an admin."}

    try:
        if tool_name == "slack_list_channels":
            limit = tool_input.get("limit", 50)
            channels = await list_channels(token, limit)
            return {"channels": channels, "count": len(channels), "workspace": config.team_name}

        elif tool_name == "slack_read_channel_messages":
            limit = min(tool_input.get("limit", 20), 50)
            messages = await get_channel_history(token, tool_input["channel_id"], limit)
            return {"messages": messages, "count": len(messages), "workspace": config.team_name}

        elif tool_name == "slack_send_message":
            result = await send_message(token, tool_input["channel"], tool_input["text"])
            return {**result, "workspace": config.team_name}

        elif tool_name == "slack_reply_to_thread":
            result = await reply_to_thread(
                token, tool_input["channel"], tool_input["thread_ts"], tool_input["text"]
            )
            return {**result, "workspace": config.team_name}

        elif tool_name == "slack_list_users":
            limit = tool_input.get("limit", 50)
            users = await list_users(token, limit)
            return {"users": users, "count": len(users), "workspace": config.team_name}

        elif tool_name == "slack_search_messages":
            count = tool_input.get("count", 10)
            results = await search_messages(token, tool_input["query"], count)
            return {"results": results, "count": len(results), "workspace": config.team_name}

        elif tool_name == "slack_get_workspace_info":
            info = await get_workspace_info(token)
            return {"workspace": info}

        else:
            return {"error": f"Unknown Slack tool: {tool_name}"}

    except Exception as e:
        logger.error("Slack tool %s failed for %s: %s", tool_name, department, e)
        return {"error": f"Slack operation failed: {e}"}
