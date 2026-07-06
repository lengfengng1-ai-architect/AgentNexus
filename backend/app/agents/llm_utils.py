"""LLM utility helpers for agent nodes.

Corresponding in_scope ID: workflow-orchestration
"""

import json
from typing import Any

from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage

from app.config.settings import settings

_log_buffer: list[dict[str, str]] = []


def write_log(node_id: str, message: str) -> None:
    """Append a live operation log message to the shared buffer."""
    _log_buffer.append({"node_id": node_id, "message": message})


def drain_logs() -> list[dict[str, str]]:
    """Drain and return all pending log messages."""
    items = list(_log_buffer)
    _log_buffer.clear()
    return items


def build_chat_model():
    """Initialize the configured chat model."""
    if settings.llm_provider == "agnes":
        return init_chat_model(
            model=settings.agnes_model,
            model_provider="openai",
            api_key=settings.agnes_api_key,
            base_url=settings.agnes_base_url,
        )
    if settings.llm_provider == "myself":
        return init_chat_model(
            model=settings.myself_model,
            model_provider="openai",
            api_key=settings.myself_api_key,
            base_url=settings.myself_base_url,
        )
    return init_chat_model(
        model=settings.dashscope_model,
        model_provider="openai",
        api_key=settings.dashscope_api_key,
        base_url=settings.dashscope_base_url,
    )


async def invoke_json(system_prompt: str, user_msg: str) -> dict[str, Any]:
    """Invoke LLM and parse JSON from markdown code fences if present."""
    msg = await build_chat_model().ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_msg),
    ])
    raw = (msg.content or "").strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()
    return json.loads(raw)
