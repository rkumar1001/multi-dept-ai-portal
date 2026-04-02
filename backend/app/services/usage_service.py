import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.usage import UsageRecord


async def record_usage(
    db: AsyncSession,
    user_id: str,
    department: str,
    input_tokens: int,
    output_tokens: int,
    tool_calls_count: int,
    model: str,
) -> UsageRecord:
    record = UsageRecord(
        user_id=user_id,
        department=department,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        tool_calls_count=tool_calls_count,
        model=model,
    )
    db.add(record)
    await db.flush()
    return record
