"""Admin API routes — /api/v1/admin/*"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.middleware.auth_middleware import CurrentUser, require_admin
from app.models.usage import DepartmentBudget, UsageRecord

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


class DepartmentUsage(BaseModel):
    department: str
    total_input_tokens: int
    total_output_tokens: int
    total_tool_calls: int
    total_requests: int
    period: str


class UsageResponse(BaseModel):
    usage: list[DepartmentUsage]
    period_start: str
    period_end: str


class BudgetUpdate(BaseModel):
    monthly_token_limit: int | None = None
    monthly_tool_call_limit: int | None = None
    max_concurrent_users: int | None = None
    alert_threshold_pct: int | None = None


class BudgetResponse(BaseModel):
    department: str
    monthly_token_limit: int
    monthly_tool_call_limit: int
    max_concurrent_users: int
    alert_threshold_pct: int
    current_token_usage: int
    current_tool_call_usage: int
    usage_pct: float


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    days: int = 30,
    admin: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated usage metrics per department for the given period."""
    period_start = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        select(
            UsageRecord.department,
            func.sum(UsageRecord.input_tokens).label("total_input"),
            func.sum(UsageRecord.output_tokens).label("total_output"),
            func.sum(UsageRecord.tool_calls_count).label("total_tools"),
            func.count(UsageRecord.id).label("total_requests"),
        )
        .where(UsageRecord.created_at >= period_start)
        .group_by(UsageRecord.department)
    )
    rows = result.all()

    return UsageResponse(
        usage=[
            DepartmentUsage(
                department=row.department,
                total_input_tokens=row.total_input or 0,
                total_output_tokens=row.total_output or 0,
                total_tool_calls=row.total_tools or 0,
                total_requests=row.total_requests or 0,
                period=f"{days}d",
            )
            for row in rows
        ],
        period_start=period_start.isoformat(),
        period_end=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/config/{dept}", response_model=BudgetResponse)
async def get_department_config(
    dept: str,
    admin: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get department budget configuration and current usage."""
    budget_result = await db.execute(
        select(DepartmentBudget).where(DepartmentBudget.department == dept)
    )
    budget = budget_result.scalar_one_or_none()
    if budget is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No budget config for '{dept}'")

    # Current month usage
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    usage_result = await db.execute(
        select(
            func.coalesce(func.sum(UsageRecord.input_tokens + UsageRecord.output_tokens), 0).label("tokens"),
            func.coalesce(func.sum(UsageRecord.tool_calls_count), 0).label("tools"),
        )
        .where(UsageRecord.department == dept, UsageRecord.created_at >= month_start)
    )
    usage_row = usage_result.one()

    token_usage = int(usage_row.tokens)
    usage_pct = (token_usage / budget.monthly_token_limit * 100) if budget.monthly_token_limit > 0 else 0

    return BudgetResponse(
        department=dept,
        monthly_token_limit=budget.monthly_token_limit,
        monthly_tool_call_limit=budget.monthly_tool_call_limit,
        max_concurrent_users=budget.max_concurrent_users,
        alert_threshold_pct=budget.alert_threshold_pct,
        current_token_usage=token_usage,
        current_tool_call_usage=int(usage_row.tools),
        usage_pct=round(usage_pct, 1),
    )


@router.put("/config/{dept}", response_model=BudgetResponse)
async def update_department_config(
    dept: str,
    body: BudgetUpdate,
    admin: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update department budget configuration."""
    budget_result = await db.execute(
        select(DepartmentBudget).where(DepartmentBudget.department == dept)
    )
    budget = budget_result.scalar_one_or_none()
    if budget is None:
        # Create default
        budget = DepartmentBudget(department=dept)
        db.add(budget)

    if body.monthly_token_limit is not None:
        budget.monthly_token_limit = body.monthly_token_limit
    if body.monthly_tool_call_limit is not None:
        budget.monthly_tool_call_limit = body.monthly_tool_call_limit
    if body.max_concurrent_users is not None:
        budget.max_concurrent_users = body.max_concurrent_users
    if body.alert_threshold_pct is not None:
        budget.alert_threshold_pct = body.alert_threshold_pct

    await db.flush()

    # Return with usage (same logic as GET)
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    usage_result = await db.execute(
        select(
            func.coalesce(func.sum(UsageRecord.input_tokens + UsageRecord.output_tokens), 0).label("tokens"),
            func.coalesce(func.sum(UsageRecord.tool_calls_count), 0).label("tools"),
        )
        .where(UsageRecord.department == dept, UsageRecord.created_at >= month_start)
    )
    usage_row = usage_result.one()
    token_usage = int(usage_row.tokens)
    usage_pct = (token_usage / budget.monthly_token_limit * 100) if budget.monthly_token_limit > 0 else 0

    return BudgetResponse(
        department=dept,
        monthly_token_limit=budget.monthly_token_limit,
        monthly_tool_call_limit=budget.monthly_tool_call_limit,
        max_concurrent_users=budget.max_concurrent_users,
        alert_threshold_pct=budget.alert_threshold_pct,
        current_token_usage=token_usage,
        current_tool_call_usage=int(usage_row.tools),
        usage_pct=round(usage_pct, 1),
    )


# ── Department Insights (mock KPIs for demo) ─────────────────────────


class KPI(BaseModel):
    label: str
    value: str
    trend: str
    trend_direction: str  # "up" | "down" | "flat"


class DepartmentInsights(BaseModel):
    department: str
    kpis: list[KPI]


class InsightsResponse(BaseModel):
    departments: list[DepartmentInsights]


_MOCK_INSIGHTS: list[DepartmentInsights] = [
    DepartmentInsights(department="sales", kpis=[
        KPI(label="Pipeline Value", value="$1.2M", trend="+12% vs last month", trend_direction="up"),
        KPI(label="Win Rate", value="34%", trend="+2% vs last month", trend_direction="up"),
        KPI(label="Avg Deal Size", value="$45K", trend="-5% vs last month", trend_direction="down"),
        KPI(label="Active Leads", value="128", trend="+18 this week", trend_direction="up"),
    ]),
    DepartmentInsights(department="finance", kpis=[
        KPI(label="Revenue (QTD)", value="$2.4M", trend="+8% vs target", trend_direction="up"),
        KPI(label="Cash Position", value="$890K", trend="Stable", trend_direction="flat"),
        KPI(label="OPEX Ratio", value="62%", trend="-3% vs last quarter", trend_direction="up"),
        KPI(label="Compliance Score", value="96%", trend="+1% this month", trend_direction="up"),
    ]),
    DepartmentInsights(department="accounting", kpis=[
        KPI(label="Open Invoices", value="$340K", trend="23 invoices pending", trend_direction="flat"),
        KPI(label="Days Sales Outstanding", value="38d", trend="-2d vs last month", trend_direction="up"),
        KPI(label="Reconciliation Rate", value="98.5%", trend="+0.5% this month", trend_direction="up"),
        KPI(label="Tax Liability (Est.)", value="$156K", trend="Q2 estimate", trend_direction="flat"),
    ]),
    DepartmentInsights(department="restaurant", kpis=[
        KPI(label="Avg Covers/Day", value="142", trend="+8% vs last week", trend_direction="up"),
        KPI(label="Food Cost %", value="28%", trend="-1.5% vs target 30%", trend_direction="up"),
        KPI(label="Revenue/Seat", value="$47", trend="+$3 vs last month", trend_direction="up"),
        KPI(label="Reservation Fill", value="78%", trend="+5% vs last week", trend_direction="up"),
    ]),
    DepartmentInsights(department="logistics", kpis=[
        KPI(label="Fleet Size", value="280", trend="All tracked via GPS", trend_direction="flat"),
        KPI(label="Vehicles Moving", value="87", trend="+12 vs yesterday", trend_direction="up"),
        KPI(label="Idle Vehicles", value="17", trend="-5 vs yesterday", trend_direction="up"),
        KPI(label="Fleet Utilization", value="37%", trend="+3% vs last week", trend_direction="up"),
    ]),
]


@router.get("/insights", response_model=InsightsResponse)
async def get_insights(
    admin: CurrentUser = Depends(require_admin),
):
    """Get department KPI insights. In production, these would come from real data sources."""
    return InsightsResponse(departments=_MOCK_INSIGHTS)
