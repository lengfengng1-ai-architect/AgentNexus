"""Intent recognition agent node.

Corresponding OpenSpec: docs/api/paths/intent.yaml
Corresponding in_scope ID: workflow-orchestration
"""

import json
import logging
from pathlib import Path
from typing import Any, AsyncGenerator

from jinja2 import Environment, FileSystemLoader
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.llm_utils import build_chat_model
from app.agents.registry import register
from app.config.settings import settings
from app.schemas.chat import BrandInput
from app.schemas.intent import IntentRecognitionOutput

logger = logging.getLogger(__name__)


def _load_system_prompt(message: str, context: dict[str, Any]) -> str:
    """Load and render the intent recognition prompt, cleaning context for Jinja2."""
    clean_ctx: dict[str, Any] = {"brand_input": {}, "conversation_history": []}

    # Pass through conversation_history
    if isinstance(context.get("conversation_history"), list):
        clean_ctx["conversation_history"] = context["conversation_history"]

    # Clean brand_input null values for template rendering
    bi = context.get("brand_input", {}) or {}
    if isinstance(bi, dict):
        for key in ("brand_name", "category", "city", "budget", "period"):
            val = bi.get(key)
            clean_ctx["brand_input"][key] = val if val is not None else None
    else:
        clean_ctx = context
    # Load intent rules from JSON for the template
    try:
        _rules_path = Path(__file__).parent.parent.parent / "mock_data" / "intent_rules.json"
        intent_rules = json.loads(_rules_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        intent_rules = {}
    env = Environment(loader=FileSystemLoader("app/prompt_templates"))
    template = env.get_template("intent_recognition.md.j2")
    return template.render(message=message, context=clean_ctx, intent_rules=intent_rules)


def _build_model():
    return build_chat_model()


def _build_structured_llm():
    return _build_model().with_structured_output(IntentRecognitionOutput)


def _parse_brand_input(data: dict[str, Any]) -> BrandInput:
    """Build BrandInput from a flat dict, normalizing keys."""
    # Accept both snake_case and the aliases historically used by the frontend demo.
    brand_name = data.get("brand_name") or data.get("brandName") or None
    category = data.get("category") or None
    city = data.get("city") or None
    budget = data.get("budget")
    period = data.get("period")
    return BrandInput(
        brand_name=brand_name,
        category=category,
        city=city,
        budget=int(budget) if budget is not None else None,
        period=int(period) if period is not None else None,
    )


def _merge_context(
    context: dict[str, Any], output: IntentRecognitionOutput
) -> IntentRecognitionOutput:
    """Merge existing brand_input from context when intent is update_context."""
    existing = context.get("brand_input", {})
    if not existing:
        return output

    merged = _parse_brand_input(existing)
    updates = output.brand_input.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(merged, key, value)

    output.brand_input = merged
    return output


async def run_intent_recognition(state: dict[str, Any]) -> dict[str, Any]:
    """Agent handler for intent recognition.

    Expects state keys:
        - message: str (required)
        - context: dict (optional)
    """
    message = state.get("message")
    if message is None:
        raise ValueError("Missing required input: message")

    context = state.get("context") or {}

    prompt = _load_system_prompt(message, context)
    if settings.enable_thinking:
        import openai
        client = openai.OpenAI(api_key=settings.myself_api_key, base_url=settings.myself_base_url)
        resp = client.chat.completions.create(
            model=settings.myself_model,
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": message}],
            extra_body={"enable_thinking": True},
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or ""
        reasoning = getattr(resp.choices[0].message, "reasoning_content", "") or ""
        result = IntentRecognitionOutput.model_validate(json.loads(raw))
        result.reasoning = reasoning
    else:
        llm = _build_structured_llm()
        result = await llm.ainvoke([SystemMessage(content=prompt), HumanMessage(content=message)])

    if result.intent == "update_context":
        result = _merge_context(context, result)
        # Recompute updated_fields based on the merged result vs original context.
        original = _parse_brand_input(context.get("brand_input", {}))
        result.updated_fields = {
            key: value
            for key, value in result.brand_input.model_dump(exclude_none=True).items()
            if getattr(original, key) != value
        }

    logger.info(
        "Intent recognized: %s (confidence=%.2f)",
        result.intent,
        result.confidence,
    )
    return result.model_dump()


async def stream_intent_recognition(
    state: dict[str, Any]
) -> AsyncGenerator[tuple[str, dict | None], None]:
    """Stream intent_recognition: yields (reasoning_chunk, None) during thinking,
    then yields ("", intent_dict) on completion.

    ponytail: sync iteration inside async generator — the OpenAI client's
    streaming .create() returns a sync iterator, which is fine since the
    async generator's yield acts as await point for the consumer.
    Upgrade path: wrap in asyncio.to_thread when the SDK adds true async.
    """
    message = state.get("message")
    if message is None:
        raise ValueError("Missing required input: message")

    context = state.get("context") or {}

    prompt = _load_system_prompt(message, context)

    if settings.enable_thinking:
        import openai
        client = openai.OpenAI(api_key=settings.myself_api_key, base_url=settings.myself_base_url)
        stream = client.chat.completions.create(
            model=settings.myself_model,
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": message}],
            extra_body={"enable_thinking": True},
            response_format={"type": "json_object"},
            stream=True,
        )
        reasoning_chunks: list[str] = []
        content_chunks: list[str] = []
        for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            rc = getattr(delta, "reasoning_content", None)
            if rc:
                reasoning_chunks.append(rc)
                yield (rc, None)
            c = getattr(delta, "content", None)
            if c:
                content_chunks.append(c)

        raw = "".join(content_chunks)
        reasoning = "".join(reasoning_chunks)
        result = IntentRecognitionOutput.model_validate(json.loads(raw))
        result.reasoning = reasoning
    else:
        llm = _build_structured_llm()
        result = await llm.ainvoke([SystemMessage(content=prompt), HumanMessage(content=message)])

    if result.intent == "update_context":
        result = _merge_context(context, result)
        original = _parse_brand_input(context.get("brand_input", {}))
        result.updated_fields = {
            key: value
            for key, value in result.brand_input.model_dump(exclude_none=True).items()
            if getattr(original, key) != value
        }
    elif context.get("brand_input"):
        # Always fill missing fields from context, for any intent
        ctx_bi = _parse_brand_input(context["brand_input"])
        merged = result.brand_input.model_dump(exclude_none=True)
        for key in ("brand_name", "category", "city", "budget", "period"):
            if merged.get(key) is None:
                val = getattr(ctx_bi, key, None)
                if val is not None:
                    setattr(result.brand_input, key, val)

    logger.info("Intent recognized: %s (confidence=%.2f)", result.intent, result.confidence)
    yield ("", result.model_dump())


register("intent_recognition", run_intent_recognition)


# ponytail: minimal deterministic fallback for tests and use_mock_data mode.
async def mock_run_intent_recognition(
    state: dict[str, Any]
) -> dict[str, Any]:
    """Deterministic mock. Registered as mock handler for 'intent_recognition'."""
    message = state.get("message")
    if not message:
        raise ValueError("Missing required input: message")

    ctx = state.get("context") or {}
    lower = message.lower()

    existing = _parse_brand_input(ctx.get("brand_input", {}))

    if "你好" in message or "能做什么" in message:
        return IntentRecognitionOutput(
            intent="chat",
            confidence=0.95,
            reply="你好！我是 AllyGo 营销方案 Agent，可以帮你生成营销方案或查询平台数据。",
            brand_input=existing,
        ).model_dump()

    if "查询" in message or "数据" in message:
        city = _extract_city(message) or existing.city or "上海"
        return IntentRecognitionOutput(
            intent="query_data",
            confidence=0.85,
            reply=f"已为你查询 {city} 的 AllyGo 平台数据。",
            brand_input=_parse_brand_input({**existing.model_dump(exclude_none=True), "city": city}),
        ).model_dump()

    if "改成" in message or "改为" in message:
        updated: dict[str, Any] = {}
        city = _extract_city(message)
        if city and city != existing.city:
            updated["city"] = city
            existing.city = city
        budget = _extract_budget(message)
        if budget is not None and budget != existing.budget:
            updated["budget"] = budget
            existing.budget = budget
        period = _extract_period(message)
        if period is not None and period != existing.period:
            updated["period"] = period
            existing.period = period
        return IntentRecognitionOutput(
            intent="update_context",
            confidence=0.9,
            reply="已更新你的需求。",
            brand_input=existing,
            updated_fields=updated,
        ).model_dump()

    # Default generate_plan attempt
    brand_name = _extract_brand(message) or existing.brand_name
    category = _extract_category(message) or existing.category
    city = _extract_city(message) or existing.city
    budget = _extract_budget(message) or existing.budget
    period = _extract_period(message) or existing.period

    brand_input = BrandInput(
        brand_name=brand_name,
        category=category,
        city=city,
        budget=budget,
        period=period,
    )
    missing = [
        field
        for field in ("brand_name", "category", "city", "budget", "period")
        if getattr(brand_input, field) is None
    ]

    if missing:
        return IntentRecognitionOutput(
            intent="clarify",
            confidence=0.8,
            reply=f"为了生成营销方案，我还需要了解：{', '.join(missing)}",
            brand_input=brand_input,
            missing_fields=missing,
        ).model_dump()

    return IntentRecognitionOutput(
        intent="generate_plan",
        confidence=0.9,
        reply=f"收到，开始为 {brand_name} 生成 {city} 营销方案。",
        brand_input=brand_input,
        gate="generate_plan",
    ).model_dump()


def _extract_brand(text: str) -> str | None:
    import re

    match = re.search(r"我是(.+?)[，,。]", text)
    return match.group(1).strip() if match else None


def _extract_category(text: str) -> str | None:
    import re

    match = re.search(r"(?:推广|做|策划)(.+?)[，,。]", text)
    return match.group(1).strip() if match else None


def _extract_city(text: str) -> str | None:
    import re

    # Match "在上海推广" or "做上海市场" but stop at verb/punctuation to avoid swallowing the rest.
    match = re.search(r"在(.+?)(?:做|推广|市场|营销|活动|的|，|。|,|\s|$)", text)
    if match:
        return match.group(1).strip()
    # Fallback for "改成北京" / "改为北京" — capture just the location word(s).
    match = re.search(r"(?:改成|改为|改為)\s*([一-龥]+?)(?:，|。|,|\s|$)", text)
    if match:
        return match.group(1).strip()
    return None


def _extract_budget(text: str) -> int | None:
    import re

    match = re.search(r"预算(\d+)(?:万|万元)", text)
    return int(match.group(1)) if match else None


def _extract_period(text: str) -> int | None:
    import re

    match = re.search(r"周期(\d+)(?:个?月|个月)", text)
    return int(match.group(1)) if match else None
