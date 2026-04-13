"""Agent orchestrator — routes queries to department-specific agents via Claude API."""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from typing import Any, AsyncIterator

import anthropic

from app.agents.registry import execute_tool, get_prompt, get_tools, get_tools_with_slack, is_email_tool, is_slack_tool, is_quickbooks_tool
from app.config import get_settings
from app.departments.common.email_tools import execute_email_tool
from app.departments.common.slack_tools import execute_slack_tool
from app.departments.common.quickbooks_tools import execute_quickbooks_tool

logger = logging.getLogger(__name__)
settings = get_settings()

# Errors that are safe to retry (transient / rate-limit)
_RETRYABLE_ERRORS = (
    anthropic.RateLimitError,
    anthropic.APIConnectionError,
    anthropic.APITimeoutError,
    anthropic.InternalServerError,
)

# Limits
_MAX_HISTORY_MESSAGES = 20  # Keep last N messages to cap input tokens
_MAX_TOOL_RESULT_CHARS = 8000  # Truncate large tool results
_MAX_TOOL_LOOPS = 5  # Prevent infinite tool loops
_RATE_LIMIT_RETRIES = 2  # Retries on 429
_RATE_LIMIT_BASE_DELAY = 5  # Seconds before first retry


def _truncate_tool_result(result: Any, max_chars: int = _MAX_TOOL_RESULT_CHARS) -> str:
    """Serialize and truncate a tool result to stay within token budget."""
    text = json.dumps(result)
    if len(text) <= max_chars:
        return text
    # Truncate and add indicator
    return text[:max_chars] + '... [truncated]"}'


def _trim_history(messages: list[dict], max_messages: int = _MAX_HISTORY_MESSAGES) -> list[dict]:
    """Keep only the last N messages to bound input tokens."""
    if len(messages) <= max_messages:
        return messages
    return messages[-max_messages:]


@dataclass
class AgentResponse:
    content: str
    input_tokens: int = 0
    output_tokens: int = 0
    tool_calls: list[dict] = field(default_factory=list)
    model: str = "claude-haiku-4-5-20251001"


class AgentOrchestrator:
    """Manages department-specific AI agents using the Claude API."""

    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-haiku-4-5-20251001"

    # ── Retry helper ──────────────────────────────────────────────────────────

    async def _create_with_retry(self, max_retries: int = 3, **kwargs) -> anthropic.types.Message:
        """Call messages.create with exponential-backoff retry on transient errors."""
        delay = 1.0
        last_error: Exception | None = None
        for attempt in range(max_retries):
            try:
                return await self.client.messages.create(**kwargs)
            except _RETRYABLE_ERRORS as exc:
                last_error = exc
                if attempt == max_retries - 1:
                    break
                logger.warning(
                    "Claude API error (attempt %d/%d): %s — retrying in %.1fs",
                    attempt + 1, max_retries, exc, delay,
                )
                await asyncio.sleep(delay)
                delay *= 2  # exponential back-off: 1s → 2s → 4s
        raise last_error  # type: ignore[misc]

    # ── Non-streaming query ───────────────────────────────────────────────────

    async def process_query(
        self,
        department: str,
        user_message: str,
        conversation_history: list[dict] | None = None,
        db: "AsyncSession | None" = None,
    ) -> AgentResponse:
        """Process a user query through the appropriate department agent."""
        try:
            system_prompt = get_prompt(department)
            tools = await get_tools_with_slack(department, db)
        except KeyError:
            return AgentResponse(content=f"Error: Unknown department '{department}'.")

        # Build message history (trimmed to cap tokens)
        messages = []
        if conversation_history:
            trimmed = _trim_history(conversation_history)
            for msg in trimmed:
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_message})

        total_input_tokens = 0
        total_output_tokens = 0
        all_tool_calls = []
        loop_count = 0

        # Agent loop: keeps running until the model produces a final text response
        while True:
            if loop_count >= _MAX_TOOL_LOOPS:
                logger.warning("Tool loop limit (%d) reached for %s, forcing text response", _MAX_TOOL_LOOPS, department)
                return AgentResponse(
                    content="I gathered the data but hit the processing limit. Here's what I found so far — please ask a more specific follow-up question.",
                    input_tokens=total_input_tokens,
                    output_tokens=total_output_tokens,
                    tool_calls=all_tool_calls,
                    model=self.model,
                )
            loop_count += 1

            kwargs = {
                "model": self.model,
                "max_tokens": 4096,
                "system": system_prompt,
                "messages": messages,
            }
            if tools:
                kwargs["tools"] = tools

            try:
                response = await self._create_with_retry(**kwargs)
            except _RETRYABLE_ERRORS as exc:
                logger.error("Claude API permanently failed after retries: %s", exc)
                return AgentResponse(
                    content=(
                        "I'm having trouble connecting to the AI service right now. "
                        f"Please try again in a moment. ({type(exc).__name__})"
                    ),
                    input_tokens=total_input_tokens,
                    output_tokens=total_output_tokens,
                    tool_calls=all_tool_calls,
                    model=self.model,
                )
            except Exception as exc:
                logger.error("Unexpected Claude API error: %s", exc)
                return AgentResponse(
                    content="An unexpected error occurred. Please try again.",
                    input_tokens=total_input_tokens,
                    output_tokens=total_output_tokens,
                    tool_calls=all_tool_calls,
                    model=self.model,
                )

            total_input_tokens += response.usage.input_tokens
            total_output_tokens += response.usage.output_tokens

            # If the model wants to use tools, execute them and loop
            if response.stop_reason == "tool_use":
                # Append the assistant's response (with tool_use blocks)
                messages.append({"role": "assistant", "content": response.content})

                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        # Email tools
                        if is_email_tool(block.name) and db is not None:
                            tool_result = await execute_email_tool(block.name, block.input, department, db)
                        # Slack tools
                        elif is_slack_tool(block.name) and db is not None:
                            tool_result = await execute_slack_tool(block.name, block.input, department, db)
                        # QuickBooks tools
                        elif is_quickbooks_tool(block.name) and db is not None:
                            tool_result = await execute_quickbooks_tool(block.name, block.input, department, db)
                        else:
                            tool_result = await execute_tool(department, block.name, block.input)

                        all_tool_calls.append({
                            "tool": block.name,
                            "input": block.input,
                            "output": tool_result,
                        })
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": _truncate_tool_result(tool_result),
                        })

                messages.append({"role": "user", "content": tool_results})
                continue

            # Final text response
            text_content = ""
            for block in response.content:
                if hasattr(block, "text"):
                    text_content += block.text

            return AgentResponse(
                content=text_content,
                input_tokens=total_input_tokens,
                output_tokens=total_output_tokens,
                tool_calls=all_tool_calls,
                model=self.model,
            )

    # ── Streaming query ───────────────────────────────────────────────────────

    async def stream_query(
        self,
        department: str,
        user_message: str,
        conversation_history: list[dict] | None = None,
        db: "AsyncSession | None" = None,
    ) -> AsyncIterator[dict]:
        """
        Stream a response from the department agent.

        Yields typed dicts:
          {"type": "text",        "content": str}           — text chunk from Claude
          {"type": "tool_status", "name": str}              — a tool is being executed
          {"type": "done",        "tool_calls": list,
                                  "input_tokens": int,
                                  "output_tokens": int}     — stream finished
          {"type": "error",       "message": str}           — unrecoverable error
        """
        try:
            system_prompt = get_prompt(department)
            tools = await get_tools_with_slack(department, db)
        except KeyError:
            yield {"type": "error", "message": f"Unknown department '{department}'"}
            return

        messages = []
        if conversation_history:
            for msg in conversation_history:
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_message})

        total_input_tokens = 0
        total_output_tokens = 0
        all_tool_calls: list[dict] = []

        # Agent loop: tool calls → stream final text
        while True:
            kwargs = {
                "model": self.model,
                "max_tokens": 4096,
                "system": system_prompt,
                "messages": messages,
            }
            if tools:
                kwargs["tools"] = tools

            # ── Retry loop around the stream ──────────────────────────────
            final_message = None
            last_error: Exception | None = None
            text_yielded_this_attempt = False

            for attempt in range(3):
                text_yielded_this_attempt = False
                try:
                    async with self.client.messages.stream(**kwargs) as stream:
                        async for text in stream.text_stream:
                            text_yielded_this_attempt = True
                            yield {"type": "text", "content": text}
                        final_message = await stream.get_final_message()
                    last_error = None
                    break  # success — exit retry loop
                except _RETRYABLE_ERRORS as exc:
                    last_error = exc
                    # Cannot retry cleanly once text has already been sent to client
                    if text_yielded_this_attempt or attempt == 2:
                        break
                    delay = 2 ** attempt  # 1s, 2s
                    logger.warning(
                        "Stream API error (attempt %d/3): %s — retrying in %ds",
                        attempt + 1, exc, delay,
                    )
                    await asyncio.sleep(delay)
                except Exception as exc:
                    last_error = exc
                    logger.error("Stream API non-retryable error: %s: %s", type(exc).__name__, exc)
                    break

            if last_error:
                yield {
                    "type": "error",
                    "message": (
                        f"AI service error after retries: {type(last_error).__name__}. "
                        "Please try again."
                    ),
                }
                return

            total_input_tokens += final_message.usage.input_tokens
            total_output_tokens += final_message.usage.output_tokens

            # Tool call turn — execute tools, then loop for the final text response
            if final_message.stop_reason == "tool_use":
                messages.append({"role": "assistant", "content": final_message.content})
                tool_results = []

                for block in final_message.content:
                    if block.type == "tool_use":
                        yield {"type": "tool_status", "name": block.name}

                        if is_email_tool(block.name) and db is not None:
                            tool_result = await execute_email_tool(block.name, block.input, department, db)
                        elif is_slack_tool(block.name) and db is not None:
                            tool_result = await execute_slack_tool(block.name, block.input, department, db)
                        elif is_quickbooks_tool(block.name) and db is not None:
                            tool_result = await execute_quickbooks_tool(block.name, block.input, department, db)
                        else:
                            tool_result = await execute_tool(department, block.name, block.input)

                        all_tool_calls.append({
                            "tool": block.name,
                            "input": block.input,
                            "output": tool_result,
                        })
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(tool_result),
                        })

                messages.append({"role": "user", "content": tool_results})
                continue  # next turn: stream the final answer

            # Final text response — stream finished
            yield {
                "type": "done",
                "tool_calls": all_tool_calls,
                "input_tokens": total_input_tokens,
                "output_tokens": total_output_tokens,
            }
            return


# Lazy singleton
_orchestrator: AgentOrchestrator | None = None


def get_orchestrator() -> AgentOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = AgentOrchestrator()
    return _orchestrator