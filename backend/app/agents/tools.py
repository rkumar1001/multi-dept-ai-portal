"""Department-specific tool definitions for the AI agents.

Each department's agent has access to different tools that correspond
to their data sources and workflows as defined in the architecture doc.
"""

from typing import Any

# ── Tool definitions per department (Claude tool_use format) ────────────────

SALES_TOOLS = [
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

FINANCE_TOOLS = [
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

ACCOUNTING_TOOLS = [
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


RESTAURANT_TOOLS = [
    {
        "name": "query_menu",
        "description": "Query the restaurant menu for items, pricing, categories, and nutritional info.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["appetizers", "mains", "desserts", "beverages", "specials"],
                    "description": "Menu category to query.",
                },
                "query": {"type": "string", "description": "Search term for menu items."},
            },
            "required": [],
        },
    },
    {
        "name": "check_inventory",
        "description": "Check current inventory levels for ingredients and supplies.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item": {"type": "string", "description": "Ingredient or supply name to check."},
                "category": {
                    "type": "string",
                    "enum": ["produce", "protein", "dairy", "dry_goods", "beverages", "supplies"],
                    "description": "Inventory category.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_reservations",
        "description": "Query reservations for a given date or period, including table assignments and party sizes.",
        "input_schema": {
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "Date to check reservations (YYYY-MM-DD)."},
                "status": {
                    "type": "string",
                    "enum": ["confirmed", "pending", "cancelled", "completed"],
                    "description": "Reservation status filter.",
                },
            },
            "required": ["date"],
        },
    },
]


DEPARTMENT_TOOLS = {
    "sales": SALES_TOOLS,
    "finance": FINANCE_TOOLS,
    "accounting": ACCOUNTING_TOOLS,
    "restaurant": RESTAURANT_TOOLS,
}


# ── Simulated tool execution ───────────────────────────────────────────────
# In production these would call real APIs (Salesforce, SAP, QuickBooks, etc.)

async def execute_tool(department: str, tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any]:
    """Execute a department tool and return results. Simulated for development."""
    handlers = {
        "query_crm": _mock_crm,
        "search_email_logs": _mock_email_search,
        "get_market_data": _mock_market_data,
        "query_erp": _mock_erp,
        "get_cash_flow_forecast": _mock_cash_flow,
        "check_compliance": _mock_compliance,
        "query_invoices": _mock_invoices,
        "reconcile_accounts": _mock_reconciliation,
        "calculate_tax": _mock_tax,
        "query_menu": _mock_menu,
        "check_inventory": _mock_inventory,
        "get_reservations": _mock_reservations,
    }
    handler = handlers.get(tool_name)
    if handler is None:
        return {"error": f"Unknown tool: {tool_name}"}
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


async def _mock_menu(params: dict) -> dict:
    return {
        "category": params.get("category", "all"),
        "results": [
            {"name": "Grilled Salmon", "category": "mains", "price": 28.00, "food_cost": 8.40, "cost_pct": "30%"},
            {"name": "Caesar Salad", "category": "appetizers", "price": 14.00, "food_cost": 3.50, "cost_pct": "25%"},
            {"name": "Tiramisu", "category": "desserts", "price": 12.00, "food_cost": 2.88, "cost_pct": "24%"},
        ],
    }


async def _mock_inventory(params: dict) -> dict:
    return {
        "results": [
            {"item": "Atlantic Salmon", "category": "protein", "on_hand": "15 lbs", "par_level": "20 lbs", "status": "low", "reorder_by": "2026-04-03"},
            {"item": "Romaine Lettuce", "category": "produce", "on_hand": "8 heads", "par_level": "10 heads", "status": "ok"},
            {"item": "Heavy Cream", "category": "dairy", "on_hand": "4 qt", "par_level": "6 qt", "status": "low", "reorder_by": "2026-04-03"},
        ],
    }


async def _mock_reservations(params: dict) -> dict:
    date = params.get("date", "2026-04-02")
    return {
        "date": date,
        "results": [
            {"time": "18:00", "party_size": 4, "name": "Johnson", "table": "T12", "status": "confirmed"},
            {"time": "19:00", "party_size": 2, "name": "Williams", "table": "T5", "status": "confirmed"},
            {"time": "19:30", "party_size": 6, "name": "Chen", "table": "T8", "status": "pending"},
            {"time": "20:00", "party_size": 3, "name": "Patel", "table": "T3", "status": "confirmed"},
        ],
        "total_covers": 15,
        "capacity_pct": "62%",
    }
