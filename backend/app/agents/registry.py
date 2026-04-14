"""Department registry — single point to resolve tools, prompts, and executors."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.departments.sales import tools as sales_tools
from app.departments.sales import prompts as sales_prompts
from app.departments.finance import tools as finance_tools
from app.departments.finance import prompts as finance_prompts
from app.departments.accounting import tools as accounting_tools
from app.departments.accounting import prompts as accounting_prompts
from app.departments.restaurant import tools as restaurant_tools
from app.departments.restaurant import prompts as restaurant_prompts
from app.departments.logistics import tools as logistics_tools
from app.departments.logistics import prompts as logistics_prompts
from app.departments.common.email_tools import EMAIL_TOOLS, is_email_tool  # noqa: F401 — re-exported
from app.departments.common.slack_tools import SLACK_TOOLS, is_slack_tool  # noqa: F401 — re-exported
from app.departments.common.quickbooks_tools import QUICKBOOKS_TOOLS, is_quickbooks_tool  # noqa: F401 — re-exported
from app.departments.common.weather_tools import WEATHER_TOOLS, is_weather_tool, execute_weather_tool

_REGISTRY: dict[str, dict] = {
    "sales": {"tools": sales_tools.TOOLS, "prompt": sales_prompts.SYSTEM_PROMPT, "execute": sales_tools.execute_tool},
    "finance": {"tools": finance_tools.TOOLS, "prompt": finance_prompts.SYSTEM_PROMPT, "execute": finance_tools.execute_tool},
    "accounting": {"tools": accounting_tools.TOOLS, "prompt": accounting_prompts.SYSTEM_PROMPT, "execute": accounting_tools.execute_tool},
    "restaurant": {"tools": restaurant_tools.TOOLS, "prompt": restaurant_prompts.SYSTEM_PROMPT, "execute": restaurant_tools.execute_tool},
    "logistics": {"tools": logistics_tools.TOOLS, "prompt": logistics_prompts.SYSTEM_PROMPT, "execute": logistics_tools.execute_tool},
}

SUPPORTED_DEPARTMENTS = list(_REGISTRY.keys())


def get_tools(department: str) -> list[dict]:
    entry = _REGISTRY.get(department)
    if entry is None:
        raise KeyError(f"Unknown department: {department}")
    return entry["tools"] + EMAIL_TOOLS + WEATHER_TOOLS


async def get_tools_with_slack(department: str, db: AsyncSession | None = None) -> list[dict]:
    """Return department tools + email tools + weather tools + slack tools + quickbooks tools (only if connected)."""
    entry = _REGISTRY.get(department)
    if entry is None:
        raise KeyError(f"Unknown department: {department}")
    tools = entry["tools"] + EMAIL_TOOLS + WEATHER_TOOLS
    if db is not None:
        from app.models.slack_config import DepartmentSlackConfig
        result = await db.execute(
            select(DepartmentSlackConfig).where(
                DepartmentSlackConfig.department == department,
                DepartmentSlackConfig.is_active.is_(True),
            )
        )
        if result.scalar_one_or_none() is not None:
            tools = tools + SLACK_TOOLS

        from app.models.quickbooks_config import DepartmentQuickBooksConfig
        qb_result = await db.execute(
            select(DepartmentQuickBooksConfig).where(
                DepartmentQuickBooksConfig.department == department,
                DepartmentQuickBooksConfig.is_active.is_(True),
            )
        )
        if qb_result.scalar_one_or_none() is not None:
            tools = tools + QUICKBOOKS_TOOLS
    return tools


def get_prompt(department: str) -> str:
    entry = _REGISTRY.get(department)
    if entry is None:
        raise KeyError(f"Unknown department: {department}")
    return entry["prompt"]


async def execute_tool(department: str, tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any]:
    if is_weather_tool(tool_name):
        return await execute_weather_tool(tool_name, tool_input)
    entry = _REGISTRY.get(department)
    if entry is None:
        return {"error": f"Unknown department: {department}"}
    return await entry["execute"](tool_name, tool_input)
