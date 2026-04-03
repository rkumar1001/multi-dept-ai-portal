"""Restaurant department tool definitions and execution logic.

Uses real FCM API for orders/stats and local menu data for queries.
"""

from typing import Any

import httpx

from app.config import get_settings
from app.departments.restaurant.data import (
    MASALA_TWIST_INFO,
    MASALA_TWIST_MENU,
    MASALA_TWIST_POPULAR,
)

TOOLS = [
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


async def execute_tool(tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any]:
    """Execute a restaurant tool."""
    handlers = {
        "query_menu": _real_menu,
        "get_orders": _real_get_orders,
        "get_order_stats": _real_get_order_stats,
    }
    handler = handlers.get(tool_name)
    if handler is None:
        return {"error": f"Unknown restaurant tool: {tool_name}"}
    return await handler(tool_input)


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
