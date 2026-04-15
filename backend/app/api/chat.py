"""Chat API routes — /api/v1/chat/*"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.agents.orchestrator import get_orchestrator
from app.api.upload import read_upload_as_text
from app.db.database import async_session, get_db
from app.config import get_settings
from app.middleware.auth_middleware import CurrentUser, get_current_user
from app.models.conversation import Conversation, Message
from app.services.usage_service import record_usage

_settings = get_settings()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    attachments: list[dict] | None = None  # [{file_id, filename}]


class ChatResponse(BaseModel):
    conversation_id: str
    message: str
    tool_calls: list[dict] | None = None


# ── Non-streaming endpoint ────────────────────────────────────────────────────

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

    # Load conversation history from DB
    history_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at)
    )
    history_messages = history_result.scalars().all()
    conversation_history = [{"role": m.role, "content": m.content} for m in history_messages]

    # Build enriched message with attachment content
    enriched_message = body.message
    if body.attachments:
        attachment_texts = []
        for att in body.attachments:
            file_id = att.get("file_id", "")
            filename = att.get("filename", "unknown")
            content = read_upload_as_text(file_id)
            if content:
                attachment_texts.append(f"[Attached file: {filename}]\n{content}")
        if attachment_texts:
            enriched_message = "\n\n".join(attachment_texts) + "\n\n" + body.message

    # Save user message
    user_msg = Message(conversation_id=conversation.id, role="user", content=enriched_message)
    db.add(user_msg)
    await db.flush()

    # Process through agent orchestrator
    try:
        agent_response = await get_orchestrator().process_query(
            department=current_user.department,
            user_message=enriched_message,
            conversation_history=conversation_history,
            db=db,
        )
    except Exception as exc:
        logger.error("Orchestrator error in send_message: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service temporarily unavailable. Please try again.",
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


# ── Streaming endpoint ────────────────────────────────────────────────────────

@router.post("/stream")
async def stream_chat(
    body: ChatRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream agent response via Server-Sent Events.

    SSE event types emitted:
      event: conv_id      data: {"conversation_id": str}
      event: message      data: {"content": str}
      event: tool_status  data: {"tool": str}
      event: error        data: {"message": str}
      event: done         data: {"status": "complete"|"error",
                                 "conversation_id": str,
                                 "tool_calls": list}
    """
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

    # Load history
    history_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at)
    )
    history_messages = history_result.scalars().all()
    conversation_history = [{"role": m.role, "content": m.content} for m in history_messages]

    # Save user message and commit before streaming begins so the DB session
    # is not held open for the entire duration of the SSE stream.
    user_msg = Message(conversation_id=conversation.id, role="user", content=body.message)
    db.add(user_msg)
    await db.commit()

    conv_id = str(conversation.id)
    user_id = current_user.id
    user_department = current_user.department

    async def event_generator():
        full_content: list[str] = []
        tool_calls: list[dict] = []
        input_tokens = 0
        output_tokens = 0

        # Send the conversation ID immediately so the client can track it
        # even if the user aborts before the done event
        yield {"event": "conv_id", "data": json.dumps({"conversation_id": conv_id})}

        try:
            # Use a fresh DB session for tool execution during streaming
            async with async_session() as stream_db:
                async for event in get_orchestrator().stream_query(
                    department=user_department,
                    user_message=body.message,
                    conversation_history=conversation_history,
                    db=stream_db,
                ):
                    if event["type"] == "text":
                        full_content.append(event["content"])
                        yield {"event": "message", "data": json.dumps({"content": event["content"]})}

                    elif event["type"] == "tool_status":
                        yield {"event": "tool_status", "data": json.dumps({"tool": event["name"]})}

                    elif event["type"] == "error":
                        logger.error("Stream query error event: %s", event["message"])
                        yield {"event": "error", "data": json.dumps({"message": event["message"]})}
                        yield {
                            "event": "done",
                            "data": json.dumps({"status": "error", "conversation_id": conv_id, "tool_calls": []}),
                        }
                        return

                    elif event["type"] == "done":
                        tool_calls = event["tool_calls"]
                        input_tokens = event["input_tokens"]
                        output_tokens = event["output_tokens"]

        except Exception as exc:
            logger.error("Stream event generator crashed: %s", exc)
            yield {"event": "error", "data": json.dumps({"message": "Stream interrupted. Please try again."})}
            yield {
                "event": "done",
                "data": json.dumps({"status": "error", "conversation_id": conv_id, "tool_calls": []}),
            }
            return

        # Save assistant message to DB using a fresh session (the request-scoped
        # session is already closed by the time the generator reaches this point).
        content_text = "".join(full_content)
        if content_text:
            try:
                async with async_session() as save_db:
                    assistant_msg = Message(
                        conversation_id=conv_id,
                        role="assistant",
                        content=content_text,
                        tool_calls=tool_calls if tool_calls else None,
                        token_count=input_tokens + output_tokens,
                    )
                    save_db.add(assistant_msg)

                    await record_usage(
                        db=save_db,
                        user_id=user_id,
                        department=user_department,
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                        tool_calls_count=len(tool_calls),
                        model=_settings.claude_model,
                    )
                    await save_db.commit()
            except Exception as exc:
                logger.error("Failed to save assistant message to DB: %s", exc)

        yield {
            "event": "done",
            "data": json.dumps({
                "status": "complete",
                "conversation_id": conv_id,
                "tool_calls": tool_calls,
            }),
        }

    return EventSourceResponse(
        event_generator(),
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",  # Disable buffering in nginx/ngrok
        },
    )