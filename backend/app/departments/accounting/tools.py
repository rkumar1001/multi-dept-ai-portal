"""Accounting department tool definitions and execution logic."""

from typing import Any

TOOLS = [
    {
        "name": "query_invoices",
        "description": "Query AP/AR systems for invoice data.",
        "input_schema": {
            "type": "object",
            "properties": {
                "direction": {
                    "type": "string",
                    "enum": ["payable", "receivable"],
                    "description": "AP or AR invoices.",
                },
                "status": {
                    "type": "string",
                    "enum": ["pending", "paid", "overdue", "disputed"],
                    "description": "Invoice status filter.",
                },
                "vendor_id": {"type": "string", "description": "Optional vendor/customer ID."},
            },
            "required": ["direction"],
        },
    },
    {
        "name": "reconcile_accounts",
        "description": "Run reconciliation between bank statements and book records.",
        "input_schema": {
            "type": "object",
            "properties": {
                "account_id": {"type": "string", "description": "Bank or GL account ID."},
                "period": {"type": "string", "description": "Reconciliation period (e.g., '2026-03')."},
            },
            "required": ["account_id", "period"],
        },
    },
    {
        "name": "calculate_tax",
        "description": "Calculate tax implications for a transaction or reporting period.",
        "input_schema": {
            "type": "object",
            "properties": {
                "transaction_type": {"type": "string", "description": "Type of transaction."},
                "amount": {"type": "number", "description": "Transaction amount."},
                "jurisdiction": {"type": "string", "description": "Tax jurisdiction."},
            },
            "required": ["transaction_type", "amount"],
        },
    },
]


async def execute_tool(tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any]:
    """Execute an accounting tool. Mock implementations for development."""
    handlers = {
        "query_invoices": _mock_invoices,
        "reconcile_accounts": _mock_reconciliation,
        "calculate_tax": _mock_tax,
    }
    handler = handlers.get(tool_name)
    if handler is None:
        return {"error": f"Unknown accounting tool: {tool_name}"}
    return await handler(tool_input)


async def _mock_invoices(params: dict) -> dict:
    return {
        "results": [
            {"id": "INV-2026-0451", "vendor": "Office Supplies Co.", "amount": 3200.00, "status": "pending", "due": "2026-04-15"},
            {"id": "INV-2026-0448", "vendor": "Cloud Services Inc.", "amount": 12500.00, "status": "overdue", "due": "2026-03-25"},
        ],
        "direction": params.get("direction", "payable"),
    }


async def _mock_reconciliation(params: dict) -> dict:
    return {
        "account": params.get("account_id", "BANK-001"),
        "period": params.get("period", "2026-03"),
        "bank_balance": 485230.50,
        "book_balance": 484980.50,
        "difference": 250.00,
        "unmatched_items": [
            {"date": "2026-03-29", "amount": 250.00, "description": "Bank fee not yet recorded"},
        ],
    }


async def _mock_tax(params: dict) -> dict:
    amount = params.get("amount", 0)
    return {
        "transaction_type": params.get("transaction_type", ""),
        "amount": amount,
        "jurisdiction": params.get("jurisdiction", "Federal"),
        "estimated_tax": round(amount * 0.21, 2),
        "effective_rate": "21%",
    }
