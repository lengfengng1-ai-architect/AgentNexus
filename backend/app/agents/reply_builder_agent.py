"""Reply builder agent node.

Corresponding OpenSpec: openspec/changes/add-reply-builder-to-chat-pipeline/specs/reply-builder/spec.md
Corresponding in_scope ID: workflow-orchestration
"""

import logging
from typing import Any

from jinja2 import Environment, FileSystemLoader
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.registry import register
from app.config.settings import settings
from app.schemas.reply_builder import ReplyBuilderOutput

logger = logging.getLogger(__name__)

_INTENT_TO_BRANCH_NODE = {
    "generate_plan": "extract",
    "query_data": "data_query",
    "chat": "end_reply",
    "clarify": "end_reply",
    "update_context": "end_reply",
}


def _load_system_prompt(
    message: str,
    intent: dict[str, Any],
    branch_output: dict[str, Any],
) -> str:
    env = Environment(loader=FileSystemLoader("app/prompt_templates"))
    template = env.get_template("reply_builder.md.j2")
    return template.render(
        message=message,
        intent=intent,
        branch_output=branch_output,
    )


def _build_model():
    if settings.llm_provider == "agnes":
        return init_chat_model(
            model=settings.agnes_model,
            model_provider="openai",
            api_key=settings.agnes_api_key,
            base_url=settings.agnes_base_url,
        )

    elif settings.llm_provider == "myself":
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


def _build_structured_llm():
    return _build_model().with_structured_output(ReplyBuilderOutput)


def _resolve_branch_output(
    intent: dict[str, Any], state_outputs: dict[str, Any]
) -> dict[str, Any]:
    """Pick the branch output that was actually executed based on the recognized intent.

    ponytail: input_mapping can only reference static JSONPath, so we pass the whole
    workflow outputs via ``$.state.outputs`` and resolve the active branch here.
    Upgrade path: add a dynamic ``__last__`` pointer to the orchestrator.
    """
    intent_key = intent.get("intent")
    if not isinstance(intent_key, str):
        return {}

    branch_node = _INTENT_TO_BRANCH_NODE.get(intent_key)
    if branch_node and isinstance(state_outputs, dict):
        return state_outputs.get(branch_node) or {}
    return {}


async def run_reply_builder(state: dict[str, Any]) -> dict[str, Any]:
    """Agent handler that builds a natural-language reply from intent and branch output.

    Expects state keys:
        - message: str (required)
        - intent: dict (required, output from the intent recognition node)
        - branch_output: dict (required, workflow outputs mapping node id -> output)
    """
    message = state.get("message")
    if message is None:
        raise ValueError("Missing required input: message")

    intent = state.get("intent") or {}
    branch_output = state.get("branch_output") or {}
    effective_branch = _resolve_branch_output(intent, branch_output)

    prompt = _load_system_prompt(message, intent, effective_branch)
    llm = _build_structured_llm()
    result = await llm.ainvoke([SystemMessage(content=prompt), HumanMessage(content=message)])

    logger.info("Reply built for intent '%s'", intent.get("intent"))
    return result.model_dump()


register("reply_builder", run_reply_builder)


# ponytail: minimal deterministic fallback for tests without a live LLM.
async def mock_run_reply_builder(state: dict[str, Any]) -> dict[str, Any]:
    """Deterministic mock used by unit tests. Not registered."""
    message = state.get("message", "")
    intent = state.get("intent") or {}
    branch_output = state.get("branch_output") or {}
    effective_branch = _resolve_branch_output(intent, branch_output)

    intent_key = intent.get("intent", "chat")
    brand_input = intent.get("brand_input", {})
    missing_fields = intent.get("missing_fields") or []
    updated_fields = intent.get("updated_fields") or {}

    if intent_key == "generate_plan":
        return ReplyBuilderOutput(
            reply=(
                f"好，{brand_input.get('brand_name')} 在 {brand_input.get('city')} "
                f"做 {brand_input.get('category')} 推广，预算 {brand_input.get('budget')} 万，"
                f"周期 {brand_input.get('period')} 个月，我记下了。接下来我给你生成一份营销方案。"
            )
        ).model_dump()

    if intent_key == "query_data":
        city = brand_input.get("city") or "上海"
        reply = effective_branch.get("reply") or f"已为你查询 {city} 的平台数据。"
        return ReplyBuilderOutput(reply=reply).model_dump()

    if intent_key == "clarify" and missing_fields:
        return ReplyBuilderOutput(
            reply=f"想做方案的话，我还需要确认：{', '.join(missing_fields)}。"
        ).model_dump()

    if intent_key == "update_context" and updated_fields:
        fields = "、".join(f"{k} 为 {v}" for k, v in updated_fields.items())
        return ReplyBuilderOutput(reply=f"已更新 {fields}，其他信息保持不变。").model_dump()

    return ReplyBuilderOutput(
        reply="你好！我是 AllyGo 营销方案 Agent，可以帮你生成营销方案或查询平台数据。"
    ).model_dump()
