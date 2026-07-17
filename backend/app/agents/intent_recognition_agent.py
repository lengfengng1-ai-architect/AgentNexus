"""Intent recognition agent node.

Corresponding OpenSpec: docs/api/paths/intent.yaml
Corresponding in_scope ID: workflow-orchestration
"""

import json
import logging
import re
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

    # Pass through image_urls for image/video generation intents
    image_urls = context.get("image_urls")
    if isinstance(image_urls, list) and len(image_urls) > 0:
        clean_ctx["image_urls"] = image_urls
    # Backwards compatibility: single image_url from older clients
    image_url = context.get("image_url")
    if image_url and not clean_ctx.get("image_urls"):
        clean_ctx["image_urls"] = [image_url]
    # 图片 caption（VL 生成的内容描述），过滤空串后透传
    image_captions = context.get("image_captions")
    if isinstance(image_captions, list):
        captions = [c for c in image_captions if isinstance(c, str) and c]
        if captions:
            clean_ctx["image_captions"] = captions
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


# ── 正则兜底：LLM 未提取 category 时，从用户原始输入中按优先级匹配 ──────────
_CATEGORY_PATTERNS = (
    re.compile(r'属于(.+?)品类'),
    re.compile(r'品类[是为：:]\s*(.+?)(?=[，。、\n]|$)'),
)


def _extract_category_fallback(message: str, current_category: str | None) -> str | None:
    """Fallback category extraction via regex, only when LLM didn't extract one.

    Priority:
      1. "属于 X 品类"
      2. "品类[是为：:] X"
    Returns None if no pattern matches.
    """
    if current_category is not None:
        return None  # LLM 已提取，不干预
    for pattern in _CATEGORY_PATTERNS:
        m = pattern.search(message)
        if m:
            return m.group(1).strip()
    return None


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


def _normalize_intent_output(
    output: IntentRecognitionOutput,
    *,
    image_urls: list[str] | None = None,
    image_captions: list[str] | None = None,
) -> IntentRecognitionOutput:
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

    INDEPENDENT = ("chat", "query_data", "clarify", "update_context", "generate_video", "text_to_video", "text_to_image", "market_research")

    if not missing and output.intent not in ("generate_plan", "generate_video", "text_to_video", "text_to_image", "market_research"):
        output.intent = "generate_plan"
        output.confidence = max(output.confidence, 0.95)
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

    # generate_video: image_url 检查，支持从 context.image_urls 回填
    if output.intent == "generate_video" and not output.image_url:
        if image_urls:
            output.image_url = image_urls[0]
        else:
            if "image_url" not in output.missing_fields:
                output.missing_fields = list(output.missing_fields) + ["image_url"]
            if not output.reply:
                output.reply = "好的，请提供需要生成视频的图片。"
    elif output.intent == "generate_video" and output.image_url:
        if "image_url" in output.missing_fields:
            output.missing_fields = [f for f in output.missing_fields if f != "image_url"]

    # generate_video: 有参考图但 LLM 未产出 video_prompt 时，基于 caption 生成默认文案，
    # 保证卡片描述预填（caption 是 VL 对用户图片的客观描述，非编造数据）
    if output.intent == "generate_video" and not output.video_prompt and image_captions:
        output.video_prompt = (
            f"{image_captions[0]}，产品在画面中动态展示，"
            "镜头环绕主体旋转，背景虚化突出产品，电商广告风格"
        )

    # text_to_image（以图生图 image2image）：有参考图上下文但 LLM 未回填 image_url 时补齐
    if output.intent == "text_to_image" and not output.image_url and image_urls:
        output.image_url = image_urls[0]

    # Only set brand-related missing_fields for plan-related intents
    if output.intent in ("generate_plan", "clarify"):
        output.missing_fields = missing
    # For other intents, preserve their own missing_fields (e.g. image_url)

    # generate_plan: 无论 LLM 从哪条路径进入，reply 统一覆盖为字段摘要
    if output.intent == "generate_plan":
        bi = output.brand_input
        output.reply = (
            f"品牌：{bi.brand_name} · 品类：{bi.category} · 城市：{bi.city}"
            f" · {bi.budget}万 · {bi.period}个月"
        )

    # clarify: 有缺失字段时 reply 强制覆盖为反问，避免 LLM 虚假承诺
    # （图片澄清分支见下方，优先于此处，不受品牌字段缺失影响）
    if output.intent == "clarify" and missing and not image_urls:
        _field_labels = {
            "brand_name": "品牌名",
            "category": "品类",
            "city": "城市",
            "budget": "预算",
            "period": "周期",
        }
        cn_missing = [_field_labels.get(f, f) for f in missing]
        output.reply = f"为了生成营销方案，我还需要了解：{'、'.join(cn_missing)}"

    # 图片上传澄清分支：用户上传图片但 LLM 返回 chat/clarify 时，
    # 不直接判生成意图，而是反问用户想做什么（①参数介绍图 ②宣传图 ③宣传短片）。
    # 用户下轮回复后，LLM 结合 image_urls 上下文自然分流到
    # text_to_image（以图生图）或 generate_video（以图生视频）。
    if output.intent in ("chat", "clarify") and image_urls:
        output.intent = "clarify"
        output.missing_fields = []
        output.confidence = max(output.confidence, 0.85)
        output.reply = (
            "收到图片！想让我帮你生成哪种内容？\n"
            "① 电商产品参数介绍图\n"
            "② 好看的宣传图\n"
            "③ 产品宣传短片\n"
            "或者直接说出你的想法，我来帮你实现。"
        )

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

    # 正则兜底：LLM 未提取 category 时从用户输入中提取
    fallback = _extract_category_fallback(message, result.brand_input.category)
    if fallback:
        result.brand_input.category = fallback

    image_urls = context.get("image_urls")
    if not isinstance(image_urls, list):
        image_urls = None
    image_captions = context.get("image_captions")
    if isinstance(image_captions, list):
        image_captions = [c for c in image_captions if isinstance(c, str) and c] or None
    else:
        image_captions = None

    result = _normalize_intent_output(result, image_urls=image_urls, image_captions=image_captions)

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

    # 正则兜底：LLM 未提取 category 时从用户输入中提取
    fallback = _extract_category_fallback(message, result.brand_input.category)
    if fallback:
        result.brand_input.category = fallback

    image_urls = context.get("image_urls")
    if not isinstance(image_urls, list):
        image_urls = None
    image_captions = context.get("image_captions")
    if isinstance(image_captions, list):
        image_captions = [c for c in image_captions if isinstance(c, str) and c] or None
    else:
        image_captions = None

    result = _normalize_intent_output(result, image_urls=image_urls, image_captions=image_captions)

    logger.info("Intent recognized: %s (confidence=%.2f)", result.intent, result.confidence)
    yield ("", result.model_dump())


register("intent_recognition", run_intent_recognition)
