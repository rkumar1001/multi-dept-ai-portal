"""Sales department tool definitions and execution logic."""

from typing import Any

TOOLS = [
    {
        "name": "query_crm",
        "description": "Query the CRM (Salesforce/HubSpot) for leads, deals, contacts, and pipeline data.",
        "input_schema": {
            "type": "object",
            "properties": {
                "entity": {
                    "type": "string",
                    "enum": ["leads", "deals", "contacts", "pipeline"],
                    "description": "The CRM entity type to query.",
                },
                "filters": {
                    "type": "object",
                    "description": "Key-value filters to apply (e.g., stage, owner, date range).",
                },
            },
            "required": ["entity"],
        },
    },
    {
        "name": "search_email_logs",
        "description": "Search email communication logs for a contact or deal.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query for emails."},
                "contact_id": {"type": "string", "description": "Optional contact ID to scope search."},
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_market_data",
        "description": "Retrieve competitive analysis and market data.",
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {"type": "string", "description": "Market topic or competitor name."},
            },
            "required": ["topic"],
        },
    },
]


async def execute_tool(tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any]:
    """Execute a sales tool. Mock implementations for development."""
    handlers = {
        "query_crm": _mock_crm,
        "search_email_logs": _mock_email_search,
        "get_market_data": _mock_market_data,
    }
    handler = handlers.get(tool_name)
    if handler is None:
        return {"error": f"Unknown sales tool: {tool_name}"}
    return await handler(tool_input)


async def _mock_crm(params: dict) -> dict:
    entity = params.get("entity", "deals")
    return {
        "results": [
            {"id": "deal-001", "name": "Acme Corp Enterprise", "stage": "Negotiation", "value": 125000, "probability": 0.75},
            {"id": "deal-002", "name": "TechStart Series", "stage": "Proposal", "value": 45000, "probability": 0.50},
        ],
        "total": 2,
        "entity": entity,
    }


async def _mock_email_search(params: dict) -> dict:
    return {
        "results": [
            {"date": "2026-03-28", "subject": "Re: Proposal Review", "from": "john@acme.com", "snippet": "We've reviewed the proposal and have a few questions..."},
        ],
        "total": 1,
    }


async def _mock_market_data(params: dict) -> dict:
    return {
        "topic": params.get("topic", "market"),
        "insights": "Market growing at 12% CAGR. Primary competitor holds 30% market share. Key differentiators: AI capabilities and pricing flexibility.",
    }
