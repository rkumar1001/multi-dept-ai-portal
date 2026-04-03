"""Agent orchestrator — routes queries to department-specific agents via Claude API."""

import json
from dataclasses import dataclass, field
from typing import AsyncIterator

import anthropic

from app.agents.registry import execute_tool, get_prompt, get_tools
from app.config import get_settings

settings = get_settings()


@dataclass
class AgentResponse:
    content: str
    input_tokens: int = 0
    output_tokens: int = 0
    tool_calls: list[dict] = field(default_factory=list)
    model: str = "claude-sonnet-4-20250514"


class AgentOrchestrator:
    """Manages department-specific AI agents using the Claude API."""

    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-sonnet-4-20250514"

    async def process_query(
        self,
        department: str,
        user_message: str,
        conversation_history: list[dict] | None = None,
    ) -> AgentResponse:
        """Process a user query through the appropriate department agent."""
        try:
            system_prompt = get_prompt(department)
            tools = get_tools(department)
        except KeyError:
            return AgentResponse(content=f"Error: Unknown department '{department}'.")

        # Build message history
        messages = []
        if conversation_history:
            for msg in conversation_history:
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_message})

        total_input_tokens = 0
        total_output_tokens = 0
        all_tool_calls = []

        # Agent loop: keeps running until the model produces a final text response
        while True:
            kwargs = {
                "model": self.model,
                "max_tokens": 4096,
                "system": system_prompt,
                "messages": messages,
            }
            if tools:
                kwargs["tools"] = tools

            response = await self.client.messages.create(**kwargs)

            total_input_tokens += response.usage.input_tokens
            total_output_tokens += response.usage.output_tokens

            # If the model wants to use tools, execute them and loop
            if response.stop_reason == "tool_use":
                # Append the assistant's response (with tool_use blocks)
                messages.append({"role": "assistant", "content": response.content})

                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
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

    async def stream_query(
        self,
        department: str,
        user_message: str,
        conversation_history: list[dict] | None = None,
    ) -> AsyncIterator[str]:
        """Stream a response from the department agent via SSE-compatible chunks."""
        try:
            system_prompt = get_prompt(department)
            tools = get_tools(department)
        except KeyError:
            yield f"Error: Unknown department '{department}'."
            return

        messages = []
        if conversation_history:
            for msg in conversation_history:
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_message})

        kwargs = {
            "model": self.model,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": messages,
        }
        if tools:
            kwargs["tools"] = tools

        async with self.client.messages.stream(**kwargs) as stream:
            async for text in stream.text_stream:
                yield text


# Singleton
orchestrator = AgentOrchestrator()
