"""Base interface for department modules.

Every department module must expose:
    TOOLS          – list of Claude tool-use definitions (dicts)
    SYSTEM_PROMPT  – the system prompt string for the department agent
    execute_tool   – async function(tool_name, tool_input) -> dict
"""

from typing import Any, Protocol


class DepartmentModule(Protocol):
    TOOLS: list[dict[str, Any]]
    SYSTEM_PROMPT: str

    async def execute_tool(self, tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any]: ...
