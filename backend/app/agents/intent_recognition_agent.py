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

from app.agents.llm_utils import build_chat_model
from app.agents.registry import register
from app.config.settings import settings
from app.schemas.chat import BrandInput
from app.schemas.intent import IntentRecognitionOutput

logger = logging.getLogger(__name__)


def _load_system_prompt(message: str, context: dict[str, Any]) -> list[dict[str, str]]:
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
    # ponytail: 纯图片上传时，把 image_captions 合并到 message 字段，
    # 让 LLM 明确知道"用户发送了一张图片，描述如下"，而不是空字符串。
    if not message and image_urls:
        caption_texts = clean_ctx.get("image_captions") or []
        if caption_texts:
            message = "【用户上传了图片，未输入文字】图片内容： " + "；".join(caption_texts)
        else:
            message = "【用户上传了图片，未输入文字】"
    # Load intent rules from JSON for the template
    try:
        _rules_path = Path(__file__).parent.parent.parent / "mock_data" / "intent_rules.json"
        intent_rules = json.loads(_rules_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        intent_rules = {}
    env = Environment(loader=FileSystemLoader("app/prompt_templates"))
    template = env.get_template("intent_recognition.md.j2")
    system_prompt = template.render(message=message, context=clean_ctx, intent_rules=intent_rules)

    # ponytail: 把 message 和 conversation_history 组装成 messages 格式，
    # 而不是全部塞进 system prompt。让 LLM 看到清晰的 role 分配。
    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]

    # 历史对话作为 user/assistant 消息
    conversation_history = clean_ctx.get("conversation_history") or []
    for line in conversation_history:
        if line.startswith("用户:"):
            messages.append({"role": "user", "content": line[3:].strip()})
        elif line.startswith("AI:"):
            messages.append({"role": "assistant", "content": line[3:].strip()})

    # 当前用户输入
    messages.append({"role": "user", "content": message or ""})

    return messages


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
    budget = _safe_int(data.get("budget"))
    period = _safe_int(data.get("period"))
    return BrandInput(
        brand_name=brand_name,
        category=category,
        city=city,
        budget=budget,
        period=period,
    )


def _safe_int(value: Any) -> int | None:
    """容错地把 LLM/前端传来的值转成 int。

    LLM 常见输出：50 / 50.0 / "50" / "50万" / "50.5万" / "3个月"。
    直接 int() 遇到字符串会崩，这里先抽数字再转。
    """
    if value is None:
        return None
    if isinstance(value, bool):
        # bool 是 int 子类，但要排除
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        m = re.search(r"\d+(?:\.\d+)?", value)
        if m:
            return int(float(m.group(0)))
        return None
    return None


# ── 正则兜底：LLM 未提取 category 时，从用户原始输入中按优先级匹配 ──────────
_CATEGORY_PATTERNS = (
    re.compile(r'属于(.+?)品类'),
    re.compile(r'品类[是为：:]\s*(.+?)(?=[，。、\n]|$)'),
    re.compile(r'([一-龥]{2,8})品类'),  # "运动鞋品类" → 运动鞋
    re.compile(r'做(.+?)的竞品'),       # "做运动鞋的竞品分析" → 运动鞋
    re.compile(r'[，,]\s*([一-龥]{2,8})\s*$'),  # "上海，运动鞋" → 运动鞋
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
    context_message: str | None = None,
    context: dict[str, Any] | None = None,
) -> IntentRecognitionOutput:
    """Correct intent based on field completeness and image presence.

    修复历史问题：
    - B1: 白名单不再误把 update_context/query_data/chat 强翻成 generate_plan
    - B2: generate_plan + 缺字段 → 翻 clarify（原是死代码什么都不做）
    - B3: generate_video 缺图时 missing_fields 保留 image_url（原是加完又删）
    - B4: video_prompt 不再用固定模板覆盖 LLM 输出
    """
    required = ("brand_name", "category", "city", "budget", "period")
    missing = [
        field for field in required
        if getattr(output.brand_input, field) is None
    ]

    # B1 修复：只有 clarify + 5字段齐全 才翻 generate_plan。
    # update_context/query_data/chat 即使 5 字段齐全也保持原意图（用户明确想做别的）。
    if not missing and output.intent == "clarify":
        output.intent = "generate_plan"
        output.confidence = max(output.confidence, 0.95)

    # B2 修复：generate_plan + 缺字段 → 翻 clarify + 反问
    if missing and output.intent == "generate_plan":
        output.intent = "clarify"
        output.ask_for = list(missing)
        if not output.reply:
            _set_clarify_reply(output, missing)

    # update_context 补全 category 后 → 提升为 market_research
    # 仅当 LLM 明确不在反问 category 时才提升（B5：用 ask_for 判断，不靠 reply 文本）
    if (
        output.intent == "update_context"
        and output.market_name
        and output.brand_input.category
        and "category" not in output.ask_for
    ):
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
            output.ask_for = mr_missing
            if not output.reply:
                if "market_name" in mr_missing and "category" in mr_missing:
                    output.reply = "好的，我来帮您做市场分析。请问您是想分析哪一个方向或者一个具体的市场？"
                elif "market_name" in mr_missing:
                    output.reply = "请问您想分析哪个品牌或赛道？"
                else:
                    output.reply = "请问它属于什么品类？例如：饮料、运动服饰等"
        else:
            output.missing_fields = []
            output.ask_for = []
            if not output.reply:
                output.reply = f"好的！我已了解研究目标：{output.market_name}（{output.brand_input.category}）。请点击「开始分析」按钮进行市场分析。"

    # budget_assessment: 需要 category/budget/period/city 四字段
    if output.intent == "budget_assessment":
        ba_required = ("category", "budget", "period", "city")
        ba_missing = [f for f in ba_required if getattr(output.brand_input, f) is None]
        if ba_missing:
            output.missing_fields = ba_missing
            output.ask_for = ba_missing
            _ba_labels = {"category": "品类", "budget": "预算（万元）", "period": "周期（月）", "city": "城市"}
            cn_ba = [_ba_labels.get(f, f) for f in ba_missing]
            if not output.reply:
                output.reply = f"好的，为您做预算评估。还需要了解：{'、'.join(cn_ba)}"
        else:
            output.missing_fields = []
            output.ask_for = []
            bi = output.brand_input
            if not output.reply:
                output.reply = f"好的！为您评估 {bi.category} 在 {bi.city} 的预算方案（{bi.budget}万 / {bi.period}个月），请点击「开始评估」按钮。"

    # activity_planning: 需要 sport_type + city
    if output.intent == "activity_planning":
        # 多轮对话中 LLM 可能丢 sport_type，从 context 恢复
        if not output.sport_type and context and context.get("sport_type"):
            output.sport_type = context["sport_type"]
        # activity_planning 不使用 category 字段；LLM 常把城市误放 category，
        # 当 city 为空且 category 有值时 → 挪到 city
        if not output.brand_input.city and output.brand_input.category:
            output.brand_input.city = output.brand_input.category
            output.brand_input.category = None
        ap_missing = []
        if not output.sport_type:
            ap_missing.append("sport_type")
        if not output.brand_input.city:
            ap_missing.append("city")
        if ap_missing:
            output.missing_fields = ap_missing
            output.ask_for = ap_missing
            _ap_labels = {"sport_type": "运动类型", "city": "城市"}
            cn_ap = [_ap_labels.get(f, f) for f in ap_missing]
            if not output.reply:
                output.reply = f"好的，帮您规划活动。还需要了解：{'、'.join(cn_ap)}"
        else:
            output.missing_fields = []
            output.ask_for = []
            if not output.reply:
                output.reply = f"好的！为您规划 {output.sport_type} 活动（{output.brand_input.city}），请点击「开始规划」按钮。"

    # alliance_planning: 需要 category + city
    if output.intent == "alliance_planning":
        al_missing = []
        if not output.brand_input.category:
            al_missing.append("category")
        if not output.brand_input.city:
            al_missing.append("city")
        if al_missing:
            output.missing_fields = al_missing
            output.ask_for = al_missing
            _al_labels = {"category": "品类", "city": "城市"}
            cn_al = [_al_labels.get(f, f) for f in al_missing]
            if not output.reply:
                output.reply = f"好的，帮您创建盟域。还需要了解：{'、'.join(cn_al)}"
        else:
            output.missing_fields = []
            output.ask_for = []
            if not output.reply:
                output.reply = f"好的！为您规划 {output.brand_input.category} 盟域（{output.brand_input.city}），请点击「开始规划」按钮。"

    # competitor_analysis: 需要 category（必填）+ brand_name（可选）
    if output.intent == "competitor_analysis":
        ca_missing = []
        if not output.brand_input.category:
            ca_missing.append("category")
        if ca_missing:
            output.missing_fields = ca_missing
            output.ask_for = ca_missing
            if not output.reply:
                output.reply = "好的，为您做竞品分析。请问您想分析哪个品类？例如：运动鞋、智能手表等。"
        else:
            output.missing_fields = []
            output.ask_for = []
            bn = output.brand_input.brand_name
            if bn:
                if not output.reply:
                    output.reply = f"好的！为您分析 {bn}（{output.brand_input.category}）的竞品，请点击「开始分析」按钮。"
            else:
                if not output.reply:
                    output.reply = f"好的！为您分析 {output.brand_input.category} 品类的竞争格局，请点击「开始分析」按钮。"

    # community_operations: 需要 category + city
    if output.intent == "community_operations":
        co_missing = []
        if not output.brand_input.category:
            co_missing.append("category")
        if not output.brand_input.city:
            co_missing.append("city")
        if co_missing:
            output.missing_fields = co_missing
            output.ask_for = co_missing
            _co_labels = {"category": "品类", "city": "城市"}
            cn_co = [_co_labels.get(f, f) for f in co_missing]
            if not output.reply:
                output.reply = f"好的，帮您规划社群运营。还需要了解：{'、'.join(cn_co)}"
        else:
            output.missing_fields = []
            output.ask_for = []
            if not output.reply:
                output.reply = f"好的！为您规划 {output.brand_input.category} 在 {output.brand_input.city} 的社群运营，请点击「开始规划」按钮。"

    # generate_video: image_url 检查
    # B3 修复：有 image_urls → 用；没有 → missing_fields 保留 image_url + 反问
    # （原代码刚加进 missing_fields 又立刻删掉，导致前端拿不到缺图信号）
    if output.intent == "generate_video":
        if image_urls:
            output.image_url = image_urls[0]
            # 有图时如果 missing_fields 里有 image_url（LLM 误填），清掉
            output.missing_fields = [f for f in output.missing_fields if f != "image_url"]
            if "image_url" in output.ask_for:
                output.ask_for = [f for f in output.ask_for if f != "image_url"]
        elif not output.image_url:
            # 没图且 LLM 也没填 → 加进 missing_fields 让前端知道缺图
            if "image_url" not in output.missing_fields:
                output.missing_fields = list(output.missing_fields) + ["image_url"]
            if "image_url" not in output.ask_for:
                output.ask_for = list(output.ask_for) + ["image_url"]
            if not output.reply:
                output.reply = "好的，请提供需要生成视频的图片。"

    # B4 修复：video_prompt 不再用固定模板"产品动态展示..."覆盖。
    # caption 是 VL 对图片的客观描述，LLM 应基于 caption 在提示词侧生成贴切的 video_prompt。
    # Python 端只在 LLM 既没填 video_prompt 且没有 caption 可参考时，给一个最小默认值，
    # 避免 None 导致前端卡片描述空白。
    if output.intent == "generate_video" and not output.video_prompt:
        if image_captions:
            # 有 caption 但 LLM 没生成 video_prompt → 用 caption 本身作为描述（客观，不编造动作）
            output.video_prompt = image_captions[0]
        else:
            output.video_prompt = "基于参考图生成产品宣传视频"

    # text_to_image（以图生图 image2image）：强制从 context 取真实的 image_url，
    # 防止 LLM 编造占位 URL（如 https://example.com/image1.jpg）
    if output.intent == "text_to_image" and image_urls:
        output.image_url = image_urls[0]

    # generate_plan/clarify 的 missing_fields 用 5 字段计算结果
    if output.intent in ("generate_plan", "clarify"):
        output.missing_fields = missing
        if output.intent == "clarify" and missing:
            output.ask_for = list(missing)

    # generate_plan: reply 统一覆盖为字段摘要
    if output.intent == "generate_plan":
        bi = output.brand_input
        output.reply = (
            f"品牌：{bi.brand_name} · 品类：{bi.category} · 城市：{bi.city}"
            f" · {bi.budget}万 · {bi.period}个月"
        )
        output.ask_for = []

    # clarify: 有缺失字段时 reply 强制覆盖为反问（非图片上传场景）
    if output.intent == "clarify" and missing and not image_urls:
        _set_clarify_reply(output, missing)

    # 图片上传澄清分支：用户上传图片但 LLM 返回非图片相关意图时，
    # 强制重定向为 clarify + 清空品牌字段，防止 LLM 从对话历史推断出字段。
    # 仅当 message 为空（纯图片上传）时触发，不覆盖用户已回复的情况。
    if image_urls and not (context_message or "").strip():
        if output.intent not in ("text_to_image", "generate_video", "text_to_video", "clarify"):
            output.intent = "clarify"
            output.brand_input.brand_name = None
            output.brand_input.category = None
            output.brand_input.city = None
            output.brand_input.budget = None
            output.brand_input.period = None
            output.missing_fields = []
            output.ask_for = []
            output.confidence = max(output.confidence, 0.85)

        # 纯图片上传时强制展示图片选项
        output.reply = (
            "收到图片！想让我帮你生成哪种内容？\n"
            "① 电商产品参数介绍图\n"
            "② 好看的宣传图\n"
            "③ 产品宣传短片\n"
            "或者直接说出你的想法，我来帮你实现。"
        )

    # 多轮对话上下文恢复：LLM 可能丢掉已有意图上下文，返回 clarify/chat
    # activity_planning：context 中有 sport_type → 恢复意图 + sport_type 回填
    if output.intent in ("clarify", "chat") and context and context.get("sport_type"):
        output.intent = "activity_planning"
        if not output.sport_type:
            output.sport_type = context["sport_type"]
        output.missing_fields = [f for f in output.missing_fields if f not in ("brand_name", "category", "budget", "period")]
        output.ask_for = [f for f in output.ask_for if f not in ("brand_name", "category", "budget", "period")]

    return output


def _set_clarify_reply(output: IntentRecognitionOutput, missing: list[str]) -> None:
    """填充 clarify 的反问 reply 和 ask_for。"""
    _field_labels = {
        "brand_name": "品牌名",
        "category": "品类",
        "city": "城市",
        "budget": "预算",
        "period": "周期",
    }
    cn_missing = [_field_labels.get(f, f) for f in missing]
    output.reply = f"为了生成营销方案，我还需要了解：{'、'.join(cn_missing)}"
    output.ask_for = list(missing)


def _post_process(
    result: IntentRecognitionOutput,
    *,
    message: str,
    context: dict[str, Any],
) -> IntentRecognitionOutput:
    """LLM 调用后的统一后处理（run 和 stream 共用，消除重复 + 行为不一致）。

    顺序：
    1. update_context: merge 旧 brand_input + 算 updated_fields
    2. B5 根治：用 ask_for 替代 reply 关键词判断是否在反问 category
    3. 多轮字段补全：从 context.brand_input 恢复 LLM 丢掉的字段
       （排除 ask_for 里的字段，避免盖掉 LLM 明确要反问的字段）
    4. 填充 market_name / sport_type from context
    5. 正则兜底 category
    6. 调用 _normalize_intent_output
    """
    # 1. update_context: merge 旧 brand_input + 算 updated_fields
    if result.intent == "update_context":
        result = _merge_context(context, result)
        original = _parse_brand_input(context.get("brand_input", {}))
        result.updated_fields = {
            key: value
            for key, value in result.brand_input.model_dump(exclude_none=True).items()
            if getattr(original, key) != value
        }

    # 2. B5 根治：用 ask_for 替代 reply 关键词判断
    # 原代码: if result.reply and "品类" in result.reply: result.brand_input.category = None
    # 问题：reply 文本含"品类"可能是合法确认（如"运动鞋品类，上海..."），不是反问
    # 新代码：LLM 明确在 ask_for 里声明反问 category 才清
    if "category" in result.ask_for and result.brand_input.category is not None:
        result.brand_input.category = None

    # 3. 多轮对话字段补全（非 update_context）：
    # LLM 可能丢字段，从 context.brand_input 恢复。
    # 但排除 ask_for 里的字段——LLM 明确要反问的字段不要从 context 补，否则盖掉反问。
    # （原 stream 版本有这段但放错位置——在 _normalize 之前无脑补全，导致 missing 永远为空）
    if result.intent != "update_context" and context.get("brand_input"):
        ctx_bi = _parse_brand_input(context["brand_input"])
        ask_for_set = set(result.ask_for)
        for key in ("brand_name", "category", "city", "budget", "period"):
            current = getattr(result.brand_input, key, None)
            if current is None and key not in ask_for_set:
                val = getattr(ctx_bi, key, None)
                if val is not None:
                    setattr(result.brand_input, key, val)

    # 4. 填充 market_name / sport_type from context
    if not result.market_name and context.get("market_name"):
        result.market_name = context["market_name"]
    if not result.sport_type and context.get("sport_type"):
        result.sport_type = context["sport_type"]

    # 5. 正则兜底：LLM 未提取 category 时从用户输入中提取
    fallback = _extract_category_fallback(message, result.brand_input.category)
    if fallback:
        result.brand_input.category = fallback

    # 6. image 参数 + 调用 _normalize
    image_urls = context.get("image_urls")
    if not isinstance(image_urls, list):
        image_urls = None
    image_captions = context.get("image_captions")
    if isinstance(image_captions, list):
        image_captions = [c for c in image_captions if isinstance(c, str) and c] or None
    else:
        image_captions = None

    result = _normalize_intent_output(
        result,
        image_urls=image_urls,
        image_captions=image_captions,
        context_message=message,
        context=context,
    )
    return result


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

    llm_messages = _load_system_prompt(message, context)
    logger.debug(
        "Intent recognition messages count=%d message=%r context=%r",
        len(llm_messages),
        message,
        context,
    )

    if settings.enable_thinking:
        client = openai.OpenAI(api_key=settings.myself_api_key, base_url=settings.myself_base_url)
        resp = client.chat.completions.create(
            model=settings.myself_model,
            messages=llm_messages,
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
        # C2 修复：复用上面已渲染的 llm_messages，不再重复调用 _load_system_prompt
        result = await llm.ainvoke(llm_messages)

    result = _post_process(result, message=message, context=context)
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

    # _load_system_prompt 现在返回 messages list（system + 历史对话 + 当前输入）
    llm_messages = _load_system_prompt(message, context)
    # ponytail: 打印 LLM 原始输入，方便排查意图识别问题
    logger.info(
        "LLM 输入 | messages_count=%d message=%r\n%s",
        len(llm_messages),
        message,
        json.dumps(llm_messages, ensure_ascii=False, indent=2),
    )

    if settings.enable_thinking:
        client = openai.OpenAI(api_key=settings.myself_api_key, base_url=settings.myself_base_url)
        stream = client.chat.completions.create(
            model=settings.myself_model,
            messages=llm_messages,
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
        # ponytail: 打印 LLM 原始输出，方便排查意图识别问题
        logger.info("LLM 输出 | raw=%s", raw)
        result = IntentRecognitionOutput.model_validate(json.loads(raw))
        result.reasoning = reasoning
    else:
        llm = _build_structured_llm()
        # 非 streaming 路径也改用 messages 格式
        result = await llm.ainvoke(llm_messages)
        logger.debug("Streaming intent recognition structured result: %s", result.model_dump_json(ensure_ascii=False))
        if result.reasoning:
            yield (result.reasoning, None)

    result = _post_process(result, message=message, context=context)
    # ponytail: 打印意图识别原始 Log，便于排查 LLM 误判问题
    logger.info(
        "Intent recognized | intent=%s confidence=%.2f message=%r context_brand=%s reply=%r brand_output=%s missing=%s ask_for=%s image_urls=%s",
        result.intent,
        result.confidence,
        message[:100],
        json.dumps(context.get("brand_input", {}), ensure_ascii=False),
        result.reply[:120],
        result.brand_input.model_dump_json(exclude_none=True),
        result.missing_fields,
        result.ask_for,
        bool(context.get("image_urls")),
    )
    yield ("", result.model_dump())


register("intent_recognition", run_intent_recognition)
