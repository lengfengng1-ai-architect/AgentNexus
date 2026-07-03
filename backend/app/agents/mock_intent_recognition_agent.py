"""Mock intent recognition agent for testing.

Corresponding OpenSpec: docs/api/paths/intent.yaml
Corresponding in_scope ID: workflow-orchestration
"""

import re
from typing import Any

from app.agents.registry import register
from app.schemas.chat import BrandInput
from app.schemas.intent import IntentRecognitionOutput


def _extract_brand(text: str) -> str | None:
    match = re.search(r"我是(.+?)[，,。]", text)
    return match.group(1).strip() if match else None


def _extract_category(text: str) -> str | None:
    match = re.search(r"(?:推广|做|策划)(.+?)[，,。]", text)
    return match.group(1).strip() if match else None


def _extract_city(text: str) -> str | None:
    match = re.search(r"在(.+?)(?:做|推广|市场|营销|活动|的|，|。|,|\s|$)", text)
    if match:
        return match.group(1).strip()
    match = re.search(r"(?:改成|改为|改為)\s*([一-龥]+?)(?:，|。|,|\s|$)", text)
    if match:
        return match.group(1).strip()
    return None


def _extract_budget(text: str) -> int | None:
    match = re.search(r"预算(\d+)(?:万|万元)", text)
    return int(match.group(1)) if match else None


def _extract_period(text: str) -> int | None:
    match = re.search(r"周期(\d+)(?:个?月|个月)", text)
    return int(match.group(1)) if match else None


def _parse_brand_input(data: dict[str, Any]) -> BrandInput:
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


async def mock_run_intent_recognition(state: dict[str, Any]) -> dict[str, Any]:
    """Deterministic mock intent recognizer. Does not call LLM."""
    message = state.get("message")
    if not message:
        raise ValueError("Missing required input: message")

    ctx = state.get("context") or {}
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


register("mock_intent_recognition", mock_run_intent_recognition)
