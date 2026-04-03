"""Finance department tool definitions and execution logic."""

from typing import Any

TOOLS = [
    {
        "name": "query_erp",
        "description": "Query the ERP system for financial data, GL accounts, and transactions.",
        "input_schema": {
            "type": "object",
            "properties": {
                "entity": {
                    "type": "string",
                    "enum": ["gl_accounts", "transactions", "budgets", "journal_entries"],
                    "description": "The ERP entity type to query.",
                },
                "filters": {
                    "type": "object",
                    "description": "Key-value filters (e.g., account code, date range, department).",
                },
            },
            "required": ["entity"],
        },
    },
    {
        "name": "get_cash_flow_forecast",
        "description": "Generate a cash flow forecast for a specified period.",
        "input_schema": {
            "type": "object",
            "properties": {
                "period_months": {"type": "integer", "description": "Forecast period in months."},
                "scenario": {
                    "type": "string",
                    "enum": ["base", "optimistic", "pessimistic"],
                    "description": "Forecast scenario.",
                },
            },
            "required": ["period_months"],
        },
    },
    {
        "name": "check_compliance",
        "description": "Check a transaction or report against regulatory compliance rules.",
        "input_schema": {
            "type": "object",
            "properties": {
                "regulation": {"type": "string", "description": "Regulation to check against (e.g., SOX, IFRS)."},
                "context": {"type": "string", "description": "Description of the item to evaluate."},
            },
            "required": ["regulation", "context"],
        },
    },
]


async def execute_tool(tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any]:
    """Execute a finance tool. Mock implementations for development."""
    handlers = {
        "query_erp": _mock_erp,
        "get_cash_flow_forecast": _mock_cash_flow,
        "check_compliance": _mock_compliance,
    }
    handler = handlers.get(tool_name)
    if handler is None:
        return {"error": f"Unknown finance tool: {tool_name}"}
    return await handler(tool_input)


async def _mock_erp(params: dict) -> dict:
    return {
        "results": [
            {"account": "4000-Revenue", "balance": 2_450_000, "period": "2026-Q1"},
            {"account": "5000-COGS", "balance": 1_230_000, "period": "2026-Q1"},
        ],
        "entity": params.get("entity", "gl_accounts"),
    }


async def _mock_cash_flow(params: dict) -> dict:
    return {
        "scenario": params.get("scenario", "base"),
        "period_months": params.get("period_months", 3),
        "forecast": [
            {"month": "Apr 2026", "inflow": 820000, "outflow": 650000, "net": 170000},
            {"month": "May 2026", "inflow": 780000, "outflow": 690000, "net": 90000},
            {"month": "Jun 2026", "inflow": 910000, "outflow": 700000, "net": 210000},
        ],
    }


async def _mock_compliance(params: dict) -> dict:
    return {
        "regulation": params.get("regulation", "SOX"),
        "status": "compliant",
        "notes": "All controls verified. No material weaknesses identified.",
    }
