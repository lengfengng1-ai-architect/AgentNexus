"""Intent recognition agent node.

Corresponding OpenSpec: docs/api/paths/intent.yaml
Corresponding in_scope ID: workflow-orchestration
"""

import json
import logging
from pathlib import Path
from typing import Any, AsyncGenerator

import openai
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

    # Pass through market_name for market_research intent
    if context.get("market_name"):
        clean_ctx["market_name"] = context["market_name"]

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


def _normalize_intent_output(output: IntentRecognitionOutput) -> IntentRecognitionOutput:
    """Correct intent based on field completeness.

    LLM sometimes returns clarify despite all fields being present, or
    generate_plan despite missing fields. Enforce the rule:
    - all 5 fields present -> generate_plan
    - any field missing and intent is not update_context -> clarify

    Independent intents (generate_video, text_to_video, text_to_image) are
    excluded from brand-field completeness checks.
    """
    required = ("brand_name", "category", "city", "budget", "period")
    missing = [
        field for field in required
        if getattr(output.brand_input, field) is None
    ]

    INDEPENDENT = ("clarify", "update_context", "generate_video", "text_to_video", "text_to_image", "market_research")

    if not missing and output.intent not in ("generate_plan", "generate_video", "text_to_video", "text_to_image", "market_research"):
        output.intent = "generate_plan"
        output.confidence = max(output.confidence, 0.95)
        if not output.reply:
            output.reply = "信息已确认完整，开始生成营销方案。"
    elif missing and output.intent not in INDEPENDENT:
        output.intent = "clarify"
        if not output.reply:
            output.reply = f"为了生成营销方案，我还需要了解：{', '.join(missing)}"

    # update_context 补全 category 后 → 提升为 market_research
    if output.intent == "update_context" and output.market_name and output.brand_input.category:
        output.intent = "market_research"
        output.missing_fields = []
        if not output.reply:
            output.reply = f"好的！我已了解研究目标：{output.market_name}（{output.brand_input.category}）。请点击「开始分析」按钮进行市场分析。"

    # market_research: check market_name + category
    if output.intent == "market_research":
        mr_missing = []
        if not output.market_name:
            mr_missing.append("market_name")
        if not output.brand_input.category:
            mr_missing.append("category")

        if mr_missing:
            output.missing_fields = mr_missing
            if not output.reply:
                if "market_name" in mr_missing and "category" in mr_missing:
                    output.reply = "好的，我来帮您做市场分析。请问您是想分析哪一个方向或者一个具体的市场？"
                elif "market_name" in mr_missing:
                    output.reply = "请问您想分析哪个品牌或赛道？"
                else:
                    output.reply = "请问它属于什么品类？例如：饮料、运动服饰等"
        else:
            output.missing_fields = []
            if not output.reply:
                output.reply = f"好的！我已了解研究目标：{output.market_name}（{output.brand_input.category}）。请点击「开始分析」按钮进行市场分析。"

    # generate_video: image_url 检查
    if output.intent == "generate_video" and not output.image_url:
        if "image_url" not in output.missing_fields:
            output.missing_fields = list(output.missing_fields) + ["image_url"]
        if not output.reply:
            output.reply = "好的，请提供需要生成视频的图片。"
    elif output.intent == "generate_video" and output.image_url:
        if "image_url" in output.missing_fields:
            output.missing_fields = [f for f in output.missing_fields if f != "image_url"]

    # Only set brand-related missing_fields for plan-related intents
    if output.intent in ("generate_plan", "clarify"):
        output.missing_fields = missing
    # For other intents, preserve their own missing_fields (e.g. image_url)
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
    logger.debug(
        "Intent recognition prompt for message=%r context=%r:\n%s",
        message,
        context,
        prompt,
    )

    if settings.enable_thinking:
        client = openai.OpenAI(api_key=settings.myself_api_key, base_url=settings.myself_base_url)
        resp = client.chat.completions.create(
            model=settings.myself_model,
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": message}],
            extra_body={"enable_thinking": True},
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or ""
        reasoning = getattr(resp.choices[0].message, "reasoning_content", "") or ""
        logger.debug("Intent recognition raw response: %s", raw)
        result = IntentRecognitionOutput.model_validate(json.loads(raw))
        result.reasoning = reasoning
    else:
        llm = _build_structured_llm()
        result = await llm.ainvoke([SystemMessage(content=prompt), HumanMessage(content=message)])
        logger.debug("Intent recognition structured result: %s", result.model_dump_json(ensure_ascii=False))

    if result.intent == "update_context":
        result = _merge_context(context, result)
        # Recompute updated_fields based on the merged result vs original context.
        original = _parse_brand_input(context.get("brand_input", {}))
        result.updated_fields = {
            key: value
            for key, value in result.brand_input.model_dump(exclude_none=True).items()
            if getattr(original, key) != value
        }

        # LLM reply 含"品类"时，说明 LLM 实际在问品类，
        # 但 _merge_context 从旧上下文中带入了 catgeory，
        # 清除它避免 update_context → market_research 错误提升
        if result.reply and "品类" in result.reply:
            result.brand_input.category = None

    # LLM 直接返回 market_research 时也可能同时设置 category 并反问"品类"
    if result.reply and "品类" in result.reply and result.brand_input.category is not None:
        result.brand_input.category = None

    # Fill market_name from context
    # (needed for update_context → market_research promotion downstream)
    if not result.market_name and context.get("market_name"):
        result.market_name = context["market_name"]

    result = _normalize_intent_output(result)

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
    logger.debug(
        "Streaming intent recognition prompt for message=%r context=%r:\n%s",
        message,
        context,
        prompt,
    )

    if settings.enable_thinking:
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
        logger.debug("Streaming intent recognition raw response: %s", raw)
        result = IntentRecognitionOutput.model_validate(json.loads(raw))
        result.reasoning = reasoning
    else:
        llm = _build_structured_llm()
        result = await llm.ainvoke([SystemMessage(content=prompt), HumanMessage(content=message)])
        logger.debug("Streaming intent recognition structured result: %s", result.model_dump_json(ensure_ascii=False))
        if result.reasoning:
            yield (result.reasoning, None)

    if result.intent == "update_context":
        result = _merge_context(context, result)
        original = _parse_brand_input(context.get("brand_input", {}))
        result.updated_fields = {
            key: value
            for key, value in result.brand_input.model_dump(exclude_none=True).items()
            if getattr(original, key) != value
        }

        # LLM reply 含"品类"时，清除从旧上下文 merge 来的 category
        if result.reply and "品类" in result.reply:
            result.brand_input.category = None

    # LLM 直接返回 market_research 时也可能同时设置 category 并反问"品类"
    if result.reply and "品类" in result.reply and result.brand_input.category is not None:
        result.brand_input.category = None

    if result.intent != "update_context" and context.get("brand_input"):
        # Always fill missing fields from context, for any intent
        ctx_bi = _parse_brand_input(context["brand_input"])
        merged = result.brand_input.model_dump(exclude_none=True)
        for key in ("brand_name", "category", "city", "budget", "period"):
            if merged.get(key) is None:
                val = getattr(ctx_bi, key, None)
                if val is not None:
                    setattr(result.brand_input, key, val)

    # Fill market_name from context
    if not result.market_name and context.get("market_name"):
        result.market_name = context["market_name"]

    result = _normalize_intent_output(result)

    logger.info("Intent recognized: %s (confidence=%.2f)", result.intent, result.confidence)
    yield ("", result.model_dump())


register("intent_recognition", run_intent_recognition)
