"""Department-specific tool definitions for the AI agents.

Each department's agent has access to different tools that correspond
to their data sources and workflows as defined in the architecture doc.
"""

import httpx
from typing import Any

from app.config import get_settings

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
        "description": "Query The Masala Twist restaurant menu for items, pricing, categories, and descriptions. Returns real menu data.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": [
                        "appetizers", "soup_salad_condiments", "chicken_curries",
                        "lamb_curries", "goat_curries", "tandoori_sizzlers",
                        "seafood", "vegetarian", "breads", "desserts",
                        "biryanis_rice", "kids_menu", "popular", "all"
                    ],
                    "description": "Menu category to query.",
                },
                "query": {"type": "string", "description": "Search term for menu items (e.g., 'vegan', 'chicken', 'naan')."},
            },
            "required": [],
        },
    },
    {
        "name": "get_orders",
        "description": "Retrieve recent orders from The Masala Twist order system. Shows order details including customer name, items, totals, and status.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Number of orders to retrieve (default: 20, max: 100)."},
                "offset": {"type": "integer", "description": "Offset for pagination (default: 0)."},
            },
            "required": [],
        },
    },
    {
        "name": "get_order_stats",
        "description": "Get order statistics and analytics for The Masala Twist including request counts by endpoint.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
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
        "query_menu": _real_menu,
        "get_orders": _real_get_orders,
        "get_order_stats": _real_get_order_stats,
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


# ── The Masala Twist Menu Data ──────────────────────────────────────────────

MASALA_TWIST_MENU = {
    "appetizers": [
        {"name": "Alu Samosa", "price": 5.95, "description": "2 pcs. Potatoes & peas vegetable patties served with mint chutney."},
        {"name": "Samosa Chaat", "price": 5.95, "description": "Samosa topped with garbanzo beans, onions, yogurt, and chutneys."},
        {"name": "Aloo Tikki Chaat", "price": 7.95, "description": "Vegan snack made with mashed potatoes, herbs, and spices; topped with garbanzo beans, onions, and chutneys.", "tags": ["Vegan"]},
        {"name": "Lamb Samosa", "price": 9.95, "description": "2 pcs. Patties stuffed with lamb meat, spices, and peas."},
        {"name": "Chicken Samosa", "price": 9.95, "description": "2 pcs. Patties stuffed with minced chicken, spices, and peas."},
        {"name": "Onion Bhaji", "price": 8.95, "description": "Crispy onion balls deep fried with chopped brown onions, cumin, and spices."},
        {"name": "Fish Pakora", "price": 9.95, "description": "Boneless fish marinated in herbs and spices."},
        {"name": "Chicken Pakora", "price": 9.95, "description": "Chicken pieces mixed with chickpea dough and mild spices."},
        {"name": "Assorted Appetizers", "price": 14.95, "description": "1 piece alu samosa, 4 pieces chicken pakora, 4 pieces fish pakora, and 4 pieces onion bhaji."},
        {"name": "Mixed Vegetable Pakora", "price": 8.95, "description": "Chunks of potatoes, onion, cauliflower, and spinach, deep fried."},
        {"name": "Paneer Pakora", "price": 9.95, "description": "Homemade cheese pieces mixed with chickpea flour and deep fried."},
        {"name": "Gobhi Pakora", "price": 8.95, "description": "Cauliflower deep fried with chickpea dough, lemon juice, cumin, and spices."},
        {"name": "Wings", "price": 13.95, "description": "Wings available in Tandoori, Deep Fried, Mango Habanero, Spicy Buffalo, BBQ, or Spicy BBQ flavors."},
        {"name": "Paneer Tikka", "price": 14.95, "description": "Indian cheese marinated in yogurt, lemon juice, and spices cooked on skewers."},
    ],
    "soup_salad_condiments": [
        {"name": "Chicken Soup", "price": 5.95, "description": "Breast meat chicken broth soup with spices and cilantro."},
        {"name": "Mulgatani Soup", "price": 5.95, "description": "Chicken base with lentils and rice with herbs and spices."},
        {"name": "Salad", "price": 5.95, "description": "Green salad with Persian cucumbers and tomatoes."},
        {"name": "Chicken Salad", "price": 9.95, "description": "Green salad with tomatoes, cucumber, boneless chicken, and herbs."},
        {"name": "Raita", "price": 3.95, "description": "Homemade yogurt sauce with cucumber, potatoes, tomatoes, and spices."},
        {"name": "Papadum", "price": 2.50, "description": "Crispy lentil crackers."},
        {"name": "Mango Chutney or Mango Pickle", "price": 1.95, "description": "Sweet mango slices or mango with pickled lime."},
    ],
    "chicken_curries": [
        {"name": "Chicken Tikka Masala", "price": 17.95, "description": "Boneless chicken cooked with tomato sauce, yogurt, onions, and spices."},
        {"name": "Chicken Korma", "price": 17.95, "description": "Boneless chicken breast, mildly spiced and cooked with onions and yogurt gravy with herbs."},
        {"name": "Butter Chicken", "price": 17.95, "description": "Tandoori chicken in butter, yogurt, and tomato gravy with spices."},
        {"name": "Chicken Coconut Curry", "price": 17.95, "description": "Boneless pieces cooked in special gravy and coconut milk."},
        {"name": "Chicken Chili", "price": 17.95, "description": "Chicken with bell pepper, chopped onions, tomato sauce, and spices."},
        {"name": "Chicken Vindloo Korma", "price": 17.95, "description": "Cooked South Indian style with potato, yogurt, and herbs."},
        {"name": "Chicken Curry", "price": 17.95, "description": "Mildly spiced in a special brown onion gravy."},
        {"name": "Chicken Vindaloo", "price": 17.95, "description": "Cooked South Indian style with potatoes, tomatoes, and spices."},
        {"name": "Karhai Chicken", "price": 17.95, "description": "Boneless chicken with garlic, tomatoes, bell pepper, and onions."},
        {"name": "Chicken Saag Wala", "price": 17.95, "description": "Chicken cooked with spices and fresh spinach sauce."},
        {"name": "Tofu Tikka Masala", "price": 17.95, "description": "Tofu baked in a tandoori clay oven, cooked in onion and tomato gravy with spices and coconut milk.", "tags": ["Vegan"]},
    ],
    "lamb_curries": [
        {"name": "Lamb Tikka Masala", "price": 18.95, "description": "Lamb cooked with tomato sauce, creamy yogurt, onions, and spices."},
        {"name": "Lamb Shahi Korma", "price": 18.95, "description": "Lamb mildly spiced, cooked with onion gravy, homemade yogurt sauce, and herbs."},
        {"name": "Lamb Coconut Curry", "price": 18.95, "description": "Boneless pieces cooked in special gravy and coconut milk."},
        {"name": "Lamb Vindloo Korma", "price": 18.95, "description": "Cooked South Indian style with potato, yogurt, and herbs."},
        {"name": "Saag Lela", "price": 18.95, "description": "Lamb cooked with special spices, served with cream and spinach gravy."},
        {"name": "Lamb Dopiaza", "price": 18.95, "description": "Lamb meat with brown onions, mildly cooked in garlic and tomato gravy."},
        {"name": "Karahi Gosht", "price": 18.95, "description": "Lamb meat with bell pepper, onion, and garlic, mildly spiced in tomato sauce."},
        {"name": "Rogan Josh", "price": 18.95, "description": "Marinated lamb meat in special yogurt and tomato sauce cooked with mild spices."},
        {"name": "Lamb Vindaloo", "price": 18.95, "description": "Lamb cooked South Indian style with potatoes, tomatoes, spices, and herbs."},
        {"name": "Lamb Curry", "price": 18.95, "description": "Lamb meat marinated and cooked in brown onion gravy and curry spices."},
    ],
    "goat_curries": [
        {"name": "Goat Tikka Masala", "price": 18.95, "description": "Bone-in goat cooked in special curry, tomato, and yogurt sauce."},
        {"name": "Goat Korma", "price": 18.95, "description": "Bone-in goat, mildly spiced and cooked with onions and yogurt gravy with herbs."},
        {"name": "Goat Makhni", "price": 18.95, "description": "Bone-in goat cooked with butter, yogurt, and tomato gravy with spices."},
        {"name": "Goat Curry", "price": 18.95, "description": "Bone-in goat mildly spiced in a special brown curry gravy with herbs."},
        {"name": "Mint Mutton", "price": 18.95, "description": "Mutton cooked on a slow fire with chef's special gravy, ginger, garlic, and fresh mint."},
        {"name": "Goat Coconut Curry", "price": 18.95, "description": "Bone-in goat pieces cooked in special gravy and coconut milk."},
    ],
    "tandoori_sizzlers": [
        {"name": "Tandoori Chicken (Half)", "price": 11.95, "description": "Marinated in yogurt and roasted to tenderness in a special clay oven."},
        {"name": "Tandoori Chicken (Full)", "price": 18.95, "description": "Marinated in yogurt and roasted to tenderness in a special clay oven."},
        {"name": "Chicken Tikka", "price": 17.95, "description": "Boneless white meat chicken pieces marinated in herbs and spices."},
        {"name": "Vegan Tandoori Tikka", "price": 17.95, "description": "Marinated in special vegan sauce with herbs and spices, cooked in a clay tandoori oven.", "tags": ["Vegan"]},
        {"name": "Lamb Sheesh Kabab", "price": 19.95, "description": "Minced lamb meat mixed with herbs and spices, roasted on skewer."},
        {"name": "Mixed Tandoori", "price": 23.95, "description": "Assortment of tandoori chicken, chicken tikka, shrimp tandoori, and sheesh kabab."},
        {"name": "Rack of Lamb", "price": 17.95, "description": "Lamb chops marinated in yogurt, lemon juice, and spices."},
        {"name": "Shrimp Tandoori", "price": 18.95, "description": "Jumbo shrimps marinated in yogurt with delicate spices and roasted in clay oven."},
        {"name": "Fish Tandoori", "price": 18.95, "description": "Marinated fish seasoned in herbs and spices."},
    ],
    "seafood": [
        {"name": "Shrimp Saag", "price": 18.95, "description": "Shrimp with fresh chopped spinach and mild spices with herbs."},
        {"name": "Shrimp Masala", "price": 18.95, "description": "Charbroiled tender fresh shrimp cooked in tomatoes and yogurt sauce."},
        {"name": "Fish Tikka Masala", "price": 18.95, "description": "Fish cooked in special curry gravy and yogurt sauce with mild spices."},
        {"name": "Seafood Curry", "price": 18.95, "description": "Combination of mussels, fish, shrimp, and squid mildly spiced in curry."},
        {"name": "Seafood Masala", "price": 18.95, "description": "Combination of mussels, fish, shrimp, and squid cooked in special tomato gravy, curry, and yogurt sauce."},
        {"name": "Shrimp Curry", "price": 18.95, "description": "Mildly spiced in brown onion gravy and curry spices."},
        {"name": "Shrimp Korma", "price": 18.95, "description": "Shrimp cooked with mild spices, onions, and yogurt gravy with herbs."},
        {"name": "Shrimp Coconut Curry", "price": 18.95, "description": "Shrimp pieces cooked in special gravy and coconut milk."},
    ],
    "vegetarian": [
        {"name": "Mushroom Masala", "price": 16.95, "description": "Fresh mushrooms cooked with onions, ginger, garlic, yogurt cream, tomato sauce, and curry spices."},
        {"name": "Navratan Korma", "price": 16.95, "description": "Assorted fresh vegetables cooked with homemade yogurt sauce, herbs, and spices."},
        {"name": "Shahi Paneer", "price": 16.95, "description": "Indian cheese cooked with onion gravy, yogurt sauce, herbs, and spices."},
        {"name": "Paneer Masala", "price": 16.95, "description": "Homemade Indian cheese cooked with tomatoes, onions, and creamy yogurt sauce with spices."},
        {"name": "Paneer Makhni", "price": 16.95, "description": "Homemade Indian cheese cooked with butter, yogurt, and tomato gravy with spices."},
        {"name": "Paneer Karahi", "price": 16.95, "description": "Homemade Indian cheese cooked with bell pepper, onions, and tomatoes."},
        {"name": "Saag Paneer", "price": 16.95, "description": "Fresh spinach cooked curry style with herbs and homemade cheese."},
        {"name": "Malai Kofta", "price": 16.95, "description": "Vegetable balls made with mixed vegetables, served in fresh cream, tomato, and onion gravy with mild spices."},
        {"name": "Daal Makhni", "price": 16.95, "description": "Lentils mildly spiced, cooked with butter, garlic, ginger, and herbs."},
        {"name": "Mirch Ka Salan", "price": 16.95, "description": "Pickled jalapeños cooked with fresh tomatoes, garlic, ginger, onions, cumin, and creamy yogurt sauce."},
        {"name": "Kadi Pakora", "price": 16.95, "description": "Yogurt curry cooked with chickpea flour and spices with vegetable balls."},
        {"name": "Mix Vegetable Coconut Curry", "price": 16.95, "description": "Fresh assorted vegetables cooked with onion gravy and coconut milk.", "tags": ["Vegan"]},
        {"name": "Saag Alu", "price": 16.95, "description": "Fresh spinach cooked curry style with potato and seasoned herbs and spices.", "tags": ["Vegan"]},
        {"name": "Alu Gobhi", "price": 16.95, "description": "Fresh cauliflower and potato curry with herbs and spices.", "tags": ["Vegan"]},
        {"name": "Bengan Bhartha", "price": 16.95, "description": "Fresh eggplant first roasted in the tandoori oven, then cooked curry style with fresh tomatoes and grilled onions.", "tags": ["Vegan"]},
        {"name": "Chana Saag", "price": 16.95, "description": "Fresh spinach cooked curry style with garbanzo beans and seasoned herbs and spices.", "tags": ["Vegan"]},
        {"name": "Channa Masala", "price": 16.95, "description": "Chickpeas cooked with brown onions, garlic, ginger, and spices.", "tags": ["Vegan"]},
        {"name": "Daal Tudka", "price": 16.95, "description": "Yellow lentils cooked with onions, ginger, garlic, herbs, and spices.", "tags": ["Vegan"]},
        {"name": "Alu Bengan", "price": 16.95, "description": "Potatoes and fresh Indian baby eggplant cooked with spices and herbs.", "tags": ["Vegan"]},
        {"name": "Bhindi Bhaji", "price": 16.95, "description": "Fresh okra cooked in herbs and spices with onions, ginger, and garlic.", "tags": ["Vegan"]},
    ],
    "breads": [
        {"name": "Chapati Tandoori", "price": 2.95, "description": "Indian style basic whole wheat bread cooked in the clay oven."},
        {"name": "Naan", "price": 2.95, "description": "Indian style leavened white bread."},
        {"name": "Paratha", "price": 3.95, "description": "Indian style multilayered whole wheat bread."},
        {"name": "Onion Kulcha", "price": 4.95, "description": "North Indian specialty naan bread stuffed with onions and herbs."},
        {"name": "Keema Naan", "price": 5.95, "description": "Naan stuffed with delicately spiced minced lamb meat and green peas."},
        {"name": "Garlic Naan", "price": 3.95, "description": "Naan bread with fresh chopped garlic and cilantro."},
        {"name": "Garlic Cheese Naan", "price": 5.95, "description": "Naan bread filled with cheese, topped with fresh garlic and cilantro."},
        {"name": "Alu Paratha", "price": 4.95, "description": "Whole wheat paratha stuffed with spiced mashed potatoes and green peas."},
        {"name": "Gobhi Paratha", "price": 4.95, "description": "Whole wheat paratha stuffed with spiced cauliflower, cumin, and coriander."},
        {"name": "Spinach & Cheese Naan", "price": 5.95, "description": "Stuffed with cheese, spinach, and herbs."},
        {"name": "Puri", "price": 2.95, "description": "Whole wheat deep fried puffy bread."},
        {"name": "Cheese Naan", "price": 4.95, "description": "Naan bread stuffed with white cheese, herbs, and mild spices."},
        {"name": "Vegan Garlic Cheese Naan", "price": 5.95, "description": "Naan bread filled with vegan cheese, topped with fresh garlic and cilantro.", "tags": ["Vegan"]},
        {"name": "Basil Naan", "price": 4.95, "description": "Garnished with basil and rosemary."},
        {"name": "Peshwari Naan", "price": 4.95, "description": "Special Indian naan stuffed with raisins, almonds, cashews, cherries, and coconut."},
        {"name": "Indian Cheese Naan", "price": 5.95, "description": "Indian leavened bread stuffed with fresh Indian cottage cheese and spices, baked in the clay oven."},
    ],
    "desserts": [
        {"name": "Rasmalai", "price": 4.95, "description": "Freshly made soft cheese patties drenched in thick sweet milk, laced with grated pistachio, served chilled."},
        {"name": "Gulab Jamun", "price": 4.95, "description": "Freshly made milk balls deep fried to a rosy brown in purified butter and gently cooked in light rose flavored syrup."},
        {"name": "Mango Ice Cream", "price": 4.95, "description": "Prepared with mango pulp and green cardamom seeds."},
        {"name": "Rice Pudding", "price": 4.95, "description": "Basmati rice cooked with sweet milk, cashew nuts, and raisins."},
        {"name": "Kulfi", "price": 4.95, "description": "Homemade pistachio ice cream prepared with fresh green pistachio."},
        {"name": "Carrot Pudding", "price": 4.95, "description": "Fresh shredded carrot cooked with sweet milk and cream, nuts, and raisins."},
        {"name": "Mango Malai", "price": 4.95, "description": "Fresh chopped mango in cooked thick milk with nuts and raisins."},
        {"name": "Almond Ice Cream", "price": 4.95, "description": "Homemade almond ice cream prepared with fresh almonds."},
    ],
    "biryanis_rice": [
        {"name": "Shrimp Biryani", "price": 18.95, "description": "Basmati rice cooked with onion, ginger, garlic, bell peppers, and herbs. Raita included."},
        {"name": "Lamb Biryani", "price": 18.95, "description": "Basmati rice cooked with boneless lamb, onions, ginger, garlic, bell peppers, and spices. Raita included."},
        {"name": "Goat Biryani", "price": 18.95, "description": "Basmati rice cooked with tender bone-in goat, ginger, garlic, onions, bell peppers, and North Indian spices. Raita included."},
        {"name": "Chicken Biryani", "price": 17.95, "description": "Basmati rice cooked with boneless breast meat, onion, bell peppers, ginger, garlic, herbs, and spices. Raita included."},
        {"name": "Plain Rice", "price": 3.95, "description": "Steamed basmati rice."},
        {"name": "Rice Pellow", "price": 8.95, "description": "Saffron rice cooked with peas, onions, and tomatoes."},
        {"name": "Vegetables Biryani", "price": 16.95, "description": "Highly aromatic basmati rice cooked with garden fresh vegetables, curry, herbs, and spices. Raita included."},
        {"name": "Brown Rice", "price": 6.95, "description": "Steamed brown basmati rice."},
    ],
    "kids_menu": [
        {"name": "Chicken Popcorn", "price": 12.99, "description": "Served with fries and masala sauce. Includes soft drink."},
        {"name": "Chicken Nuggets", "price": 12.99, "description": "Served with fries and masala sauce. Includes soft drink."},
        {"name": "Cheese Naan (Kids)", "price": 12.99, "description": "Served with fries and masala sauce. Includes soft drink."},
        {"name": "Tandoori Chicken (Kids)", "price": 12.99, "description": "Served with rice and fries. Includes soft drink."},
    ],
}

MASALA_TWIST_POPULAR = [
    "Alu Samosa", "Tandoori Chicken", "Rack of Lamb", "Chicken Tikka Masala",
    "Chicken Coconut Curry", "Goat Curry", "Lamb Korma", "Shrimp Korma",
    "Fish Tikka Masala", "Navratan Korma", "Bengan Bhartha", "Saag Paneer",
    "Rice Pellow", "Shrimp Biryani", "Garlic Naan", "Spinach & Cheese Naan",
    "Rice Pudding", "Carrot Pudding",
]

MASALA_TWIST_INFO = {
    "name": "The Masala Twist",
    "phone": "805-832-4945",
    "address": "2810 South Harbor Blvd, Suite B1, Oxnard, CA",
    "website": "www.themasalatwistoxnard.com",
}


async def _real_menu(params: dict) -> dict:
    category = params.get("category", "all")
    query = params.get("query", "").lower()

    if category == "popular":
        all_items = []
        for items in MASALA_TWIST_MENU.values():
            all_items.extend(items)
        results = [item for item in all_items if item["name"] in MASALA_TWIST_POPULAR]
        return {"category": "Most Popular Items", "item_count": len(results), "items": results, "restaurant": MASALA_TWIST_INFO}

    if category == "all":
        if query:
            results = {}
            for cat, items in MASALA_TWIST_MENU.items():
                matched = [i for i in items if query in i["name"].lower() or query in i["description"].lower() or query in " ".join(i.get("tags", [])).lower()]
                if matched:
                    results[cat] = matched
            total = sum(len(v) for v in results.values())
            return {"search_query": query, "total_matches": total, "results_by_category": results, "restaurant": MASALA_TWIST_INFO}
        # Return summary of all categories
        summary = {cat: {"item_count": len(items), "price_range": f"${min(i['price'] for i in items):.2f} - ${max(i['price'] for i in items):.2f}"} for cat, items in MASALA_TWIST_MENU.items()}
        total = sum(len(items) for items in MASALA_TWIST_MENU.values())
        return {"total_items": total, "categories": summary, "restaurant": MASALA_TWIST_INFO}

    items = MASALA_TWIST_MENU.get(category, [])
    if not items:
        return {"error": f"Category '{category}' not found. Available: {list(MASALA_TWIST_MENU.keys())}"}
    if query:
        items = [i for i in items if query in i["name"].lower() or query in i["description"].lower()]
    return {"category": category, "item_count": len(items), "items": items, "restaurant": MASALA_TWIST_INFO}


async def _real_get_orders(params: dict) -> dict:
    settings = get_settings()
    if not settings.fcm_backend_url:
        return {"error": "FCM Backend URL not configured."}
    limit = min(params.get("limit", 20), 100)
    offset = params.get("offset", 0)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{settings.fcm_backend_url}/orders",
                params={"limit": limit, "offset": offset},
                headers={"Authorization": f"Bearer {settings.fcm_backend_secret}"},
            )
            if resp.status_code == 401:
                return {"error": "Authentication failed with FCM Backend."}
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        return {"error": f"FCM Backend returned status {e.response.status_code}."}
    except httpx.ConnectError:
        return {"error": "Could not connect to FCM Backend. The service may be unavailable."}
    except Exception as e:
        return {"error": f"Failed to fetch orders: {str(e)}"}


async def _real_get_order_stats(params: dict) -> dict:
    settings = get_settings()
    if not settings.fcm_backend_url:
        return {"error": "FCM Backend URL not configured."}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{settings.fcm_backend_url}/stats",
                headers={"Authorization": f"Bearer {settings.fcm_backend_secret}"},
            )
            if resp.status_code == 401:
                return {"error": "Authentication failed with FCM Backend."}
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        return {"error": f"FCM Backend returned status {e.response.status_code}."}
    except httpx.ConnectError:
        return {"error": "Could not connect to FCM Backend. The service may be unavailable."}
    except Exception as e:
        return {"error": f"Failed to fetch stats: {str(e)}"}
