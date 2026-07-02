"""End-reply agent node.

Corresponding OpenSpec: docs/api/paths/intent.yaml
Corresponding in_scope ID: workflow-orchestration
"""

from typing import Any

from app.agents.registry import register


async def run_end_reply(state: dict[str, Any]) -> dict[str, Any]:
    """Pass-through node for chat/clarify/update_context replies.

    Expects state keys:
        - reply: str (required)
    """
    reply = state.get("reply")
    if reply is None:
        raise ValueError("Missing required input: reply")
    return {"reply": reply}


register("end_reply", run_end_reply)
