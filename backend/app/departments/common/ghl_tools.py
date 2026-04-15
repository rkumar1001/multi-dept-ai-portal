"""Shared GoHighLevel (GHL) tools available to all departments.

Provides Claude tool definitions and a dispatcher that routes calls
through the GHL service using the department's connected account.
"""

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ghl_service import (
    get_valid_token,
    search_contacts,
    get_contact,
    create_contact,
    update_contact,
    get_conversations,
    send_message,
    get_pipelines,
    search_opportunities,
    create_opportunity,
    get_calendars,
    get_appointments,
)

logger = logging.getLogger(__name__)

GHL_TOOLS: list[dict] = [
    {
        "name": "ghl_search_contacts",
        "description": "Search for contacts in GoHighLevel CRM by name, email, or phone number.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query (name, email, or phone)"},
                "limit": {"type": "integer", "description": "Max contacts to return (default 20)", "default": 20},
            },
            "required": ["query"],
        },
    },
    {
        "name": "ghl_get_contact",
        "description": "Get full details of a specific GoHighLevel contact by their ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "contact_id": {"type": "string", "description": "The GHL contact ID"},
            },
            "required": ["contact_id"],
        },
    },
    {
        "name": "ghl_create_contact",
        "description": "Create a new contact in GoHighLevel CRM.",
        "input_schema": {
            "type": "object",
            "properties": {
                "first_name": {"type": "string", "description": "Contact's first name"},
                "last_name": {"type": "string", "description": "Contact's last name"},
                "email": {"type": "string", "description": "Contact's email address"},
                "phone": {"type": "string", "description": "Contact's phone number"},
                "company_name": {"type": "string", "description": "Contact's company"},
                "tags": {"type": "array", "items": {"type": "string"}, "description": "Tags to add to the contact"},
                "source": {"type": "string", "description": "Lead source"},
            },
        },
    },
    {
        "name": "ghl_update_contact",
        "description": "Update an existing GoHighLevel contact's information.",
        "input_schema": {
            "type": "object",
            "properties": {
                "contact_id": {"type": "string", "description": "The GHL contact ID to update"},
                "first_name": {"type": "string", "description": "Updated first name"},
                "last_name": {"type": "string", "description": "Updated last name"},
                "email": {"type": "string", "description": "Updated email"},
                "phone": {"type": "string", "description": "Updated phone"},
                "company_name": {"type": "string", "description": "Updated company"},
                "tags": {"type": "array", "items": {"type": "string"}, "description": "Updated tags"},
            },
            "required": ["contact_id"],
        },
    },
    {
        "name": "ghl_get_conversations",
        "description": "List recent conversations/messages in GoHighLevel.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Max conversations to return (default 20)", "default": 20},
            },
        },
    },
    {
        "name": "ghl_send_message",
        "description": "Send an SMS or Email message to a contact via GoHighLevel. Always confirm the message content with the user before sending.",
        "input_schema": {
            "type": "object",
            "properties": {
                "contact_id": {"type": "string", "description": "The GHL contact ID to message"},
                "message_type": {"type": "string", "enum": ["SMS", "Email"], "description": "Message type: SMS or Email"},
                "message": {"type": "string", "description": "The message text to send"},
            },
            "required": ["contact_id", "message_type", "message"],
        },
    },
    {
        "name": "ghl_get_pipelines",
        "description": "List all sales pipelines in GoHighLevel with their stages.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "ghl_search_opportunities",
        "description": "Search for opportunities/deals in a GoHighLevel pipeline.",
        "input_schema": {
            "type": "object",
            "properties": {
                "pipeline_id": {"type": "string", "description": "Filter by pipeline ID (from ghl_get_pipelines)"},
                "limit": {"type": "integer", "description": "Max opportunities to return (default 20)", "default": 20},
            },
        },
    },
    {
        "name": "ghl_create_opportunity",
        "description": "Create a new opportunity/deal in a GoHighLevel pipeline.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Opportunity name"},
                "pipeline_id": {"type": "string", "description": "Pipeline ID (from ghl_get_pipelines)"},
                "pipeline_stage_id": {"type": "string", "description": "Stage ID within the pipeline"},
                "contact_id": {"type": "string", "description": "Associated contact ID"},
                "monetary_value": {"type": "number", "description": "Deal value in dollars"},
                "status": {"type": "string", "enum": ["open", "won", "lost", "abandoned"], "description": "Opportunity status"},
            },
            "required": ["name", "pipeline_id", "pipeline_stage_id"],
        },
    },
    {
        "name": "ghl_get_calendars",
        "description": "List all calendars configured in GoHighLevel.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "ghl_get_appointments",
        "description": "Get upcoming appointments/bookings from a GoHighLevel calendar.",
        "input_schema": {
            "type": "object",
            "properties": {
                "start_time": {"type": "string", "description": "Start of time range (ISO 8601, e.g. 2024-01-01T00:00:00Z)"},
                "end_time": {"type": "string", "description": "End of time range (ISO 8601, e.g. 2024-01-31T23:59:59Z)"},
                "calendar_id": {"type": "string", "description": "Filter by specific calendar ID (from ghl_get_calendars)"},
            },
            "required": ["start_time", "end_time"],
        },
    },
]

GHL_TOOL_NAMES = {t["name"] for t in GHL_TOOLS}


def is_ghl_tool(tool_name: str) -> bool:
    return tool_name in GHL_TOOL_NAMES


async def execute_ghl_tool(
    tool_name: str,
    tool_input: dict[str, Any],
    department: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """Execute a GHL tool call for the given department."""
    try:
        token, config = await get_valid_token(db, department)
    except ValueError as e:
        return {"error": str(e)}
    except Exception as e:
        logger.error("Failed to get GHL token for %s: %s", department, e)
        return {"error": "Failed to access GoHighLevel. The connection may need to be re-established by an admin."}

    location_id = config.location_id

    try:
        if tool_name == "ghl_search_contacts":
            limit = tool_input.get("limit", 20)
            contacts = await search_contacts(token, location_id, tool_input["query"], limit)
            return {"contacts": contacts, "count": len(contacts), "location": config.location_name}

        elif tool_name == "ghl_get_contact":
            contact = await get_contact(token, tool_input["contact_id"])
            return {"contact": contact, "location": config.location_name}

        elif tool_name == "ghl_create_contact":
            contact_data: dict[str, Any] = {}
            if tool_input.get("first_name"):
                contact_data["firstName"] = tool_input["first_name"]
            if tool_input.get("last_name"):
                contact_data["lastName"] = tool_input["last_name"]
            if tool_input.get("email"):
                contact_data["email"] = tool_input["email"]
            if tool_input.get("phone"):
                contact_data["phone"] = tool_input["phone"]
            if tool_input.get("company_name"):
                contact_data["companyName"] = tool_input["company_name"]
            if tool_input.get("tags"):
                contact_data["tags"] = tool_input["tags"]
            if tool_input.get("source"):
                contact_data["source"] = tool_input["source"]
            contact = await create_contact(token, location_id, contact_data)
            return {"contact": contact, "location": config.location_name, "created": True}

        elif tool_name == "ghl_update_contact":
            contact_id = tool_input.pop("contact_id")
            contact_data = {}
            if tool_input.get("first_name"):
                contact_data["firstName"] = tool_input["first_name"]
            if tool_input.get("last_name"):
                contact_data["lastName"] = tool_input["last_name"]
            if tool_input.get("email"):
                contact_data["email"] = tool_input["email"]
            if tool_input.get("phone"):
                contact_data["phone"] = tool_input["phone"]
            if tool_input.get("company_name"):
                contact_data["companyName"] = tool_input["company_name"]
            if tool_input.get("tags"):
                contact_data["tags"] = tool_input["tags"]
            contact = await update_contact(token, contact_id, contact_data)
            return {"contact": contact, "location": config.location_name, "updated": True}

        elif tool_name == "ghl_get_conversations":
            limit = tool_input.get("limit", 20)
            conversations = await get_conversations(token, location_id, limit)
            return {"conversations": conversations, "count": len(conversations), "location": config.location_name}

        elif tool_name == "ghl_send_message":
            result = await send_message(
                token, location_id,
                tool_input["contact_id"],
                tool_input["message_type"],
                tool_input["message"],
            )
            return {**result, "location": config.location_name}

        elif tool_name == "ghl_get_pipelines":
            pipelines = await get_pipelines(token, location_id)
            return {"pipelines": pipelines, "count": len(pipelines), "location": config.location_name}

        elif tool_name == "ghl_search_opportunities":
            limit = tool_input.get("limit", 20)
            pipeline_id = tool_input.get("pipeline_id")
            opps = await search_opportunities(token, location_id, pipeline_id, limit)
            return {"opportunities": opps, "count": len(opps), "location": config.location_name}

        elif tool_name == "ghl_create_opportunity":
            opp_data: dict[str, Any] = {
                "name": tool_input["name"],
                "pipelineId": tool_input["pipeline_id"],
                "pipelineStageId": tool_input["pipeline_stage_id"],
            }
            if tool_input.get("contact_id"):
                opp_data["contactId"] = tool_input["contact_id"]
            if tool_input.get("monetary_value") is not None:
                opp_data["monetaryValue"] = tool_input["monetary_value"]
            if tool_input.get("status"):
                opp_data["status"] = tool_input["status"]
            opp = await create_opportunity(token, location_id, opp_data)
            return {"opportunity": opp, "location": config.location_name, "created": True}

        elif tool_name == "ghl_get_calendars":
            calendars = await get_calendars(token, location_id)
            return {"calendars": calendars, "count": len(calendars), "location": config.location_name}

        elif tool_name == "ghl_get_appointments":
            appointments = await get_appointments(
                token, location_id,
                tool_input["start_time"],
                tool_input["end_time"],
                tool_input.get("calendar_id"),
            )
            return {"appointments": appointments, "count": len(appointments), "location": config.location_name}

        else:
            return {"error": f"Unknown GHL tool: {tool_name}"}

    except Exception as e:
        logger.error("GHL tool %s failed for %s: %s", tool_name, department, e)
        return {"error": f"GoHighLevel operation failed: {e}"}
