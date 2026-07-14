"""Prompt optimizer — AI-driven prompt enhancement for video/image/brand copy.

Preserves the original intent while enriching details, scene description,
visual language, and professional terminology for each media type.

OpenSpec: prompt-optimizer
"""
import json
import logging

from jinja2 import Environment, FileSystemLoader
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.agents.llm_utils import build_chat_model

logger = logging.getLogger(__name__)

_TEMPLATE_ENV = Environment(loader=FileSystemLoader("app/prompt_templates"))


class OptimizedPrompt(BaseModel):
    optimized: str = Field(..., description="优化后的提示词文本")
    reason: str = Field(default="", description="优化说明（简要描述做了哪些增强）")


async def optimize_prompt(prompt: str, prompt_type: str) -> OptimizedPrompt:
    """Call LLM to optimize a prompt for the given media type."""
    if not prompt.strip():
        raise ValueError("提示词不能为空")

    template = _TEMPLATE_ENV.get_template("prompt_optimizer.md.j2")
    system_prompt = template.render(type=prompt_type, prompt=prompt)

    llm = build_chat_model()
    response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        # no separate HumanMessage — the prompt template includes user input already
    ])

    text = response.content.strip() if response.content else ""
    try:
        parsed = json.loads(text)
        return OptimizedPrompt(**parsed)
    except (json.JSONDecodeError, KeyError, TypeError):
        return OptimizedPrompt(optimized=text, reason="AI 优化后")
