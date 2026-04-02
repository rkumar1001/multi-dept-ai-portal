"""Chat API routes — /api/v1/chat/*"""

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.agents.orchestrator import orchestrator
from app.db.database import get_db
from app.middleware.auth_middleware import CurrentUser, get_current_user
from app.models.conversation import Conversation, Message
from app.services.usage_service import record_usage

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    conversation_id: str
    message: str
    tool_calls: list[dict] | None = None


@router.post("", response_model=ChatResponse)
async def send_message(
    body: ChatRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get or create conversation
    if body.conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == body.conversation_id,
                Conversation.user_id == current_user.id,
            )
        )
        conversation = result.scalar_one_or_none()
        if conversation is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    else:
        conversation = Conversation(
            user_id=current_user.id,
            department=current_user.department,
            title=body.message[:100],
        )
        db.add(conversation)
        await db.flush()

    # Load conversation history
    history_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at)
    )
    history_messages = history_result.scalars().all()
    conversation_history = [{"role": m.role, "content": m.content} for m in history_messages]

    # Save user message
    user_msg = Message(conversation_id=conversation.id, role="user", content=body.message)
    db.add(user_msg)
    await db.flush()

    # Process through agent orchestrator
    agent_response = await orchestrator.process_query(
        department=current_user.department,
        user_message=body.message,
        conversation_history=conversation_history,
    )

    # Save assistant message
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=agent_response.content,
        tool_calls=agent_response.tool_calls if agent_response.tool_calls else None,
        token_count=agent_response.input_tokens + agent_response.output_tokens,
    )
    db.add(assistant_msg)

    # Record usage
    await record_usage(
        db=db,
        user_id=current_user.id,
        department=current_user.department,
        input_tokens=agent_response.input_tokens,
        output_tokens=agent_response.output_tokens,
        tool_calls_count=len(agent_response.tool_calls),
        model=agent_response.model,
    )

    return ChatResponse(
        conversation_id=str(conversation.id),
        message=agent_response.content,
        tool_calls=agent_response.tool_calls if agent_response.tool_calls else None,
    )


@router.get("/stream")
async def stream_chat(
    message: str,
    conversation_id: str | None = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stream agent response via Server-Sent Events."""

    conversation_history = []
    if conversation_id:
        history_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
        )
        history_messages = history_result.scalars().all()
        conversation_history = [{"role": m.role, "content": m.content} for m in history_messages]

    async def event_generator():
        async for chunk in orchestrator.stream_query(
            department=current_user.department,
            user_message=message,
            conversation_history=conversation_history,
        ):
            yield {"event": "message", "data": json.dumps({"content": chunk})}
        yield {"event": "done", "data": json.dumps({"status": "complete"})}

    return EventSourceResponse(event_generator())
