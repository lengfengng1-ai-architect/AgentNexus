"""人群洞察 Service — 通过 agent 的 StateGraph.astream_events() 消费。

superpowers in_scope ID: audience-insight
"""

import json
from collections.abc import AsyncGenerator
from typing import Any

from app.agents.audience_insight_agent import _graph, run_audience_insight
from app.config.cache_paths import AUDIENCE_DIR, PERSONA_DIR, audience_path, persona_path
from app.schemas.audience_insight import (
    AudienceInsightResponse,
    AudienceRawData,
    UserPersona,
)


def _load_cache(product_name: str) -> AudienceInsightResponse | None:
    ap = audience_path(product_name)
    pp = persona_path(product_name)
    if ap.exists() and pp.exists():
        return AudienceInsightResponse(
            product_name=product_name,
            audience_data=AudienceRawData.model_validate(json.loads(ap.read_text(encoding="utf-8"))),
            persona=UserPersona.model_validate(json.loads(pp.read_text(encoding="utf-8"))),
            from_cache=True,
        )
    return None


def _save_cache(product_name: str, audience: AudienceRawData, persona: UserPersona) -> None:
    AUDIENCE_DIR.mkdir(parents=True, exist_ok=True)
    PERSONA_DIR.mkdir(parents=True, exist_ok=True)
    audience_path(product_name).write_text(audience.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8")
    persona_path(product_name).write_text(persona.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8")


async def get_audience_insight(
    product_name: str,
    product_info: dict | None = None,
    market_info: dict | None = None,
) -> AudienceInsightResponse:
    """获取人群洞察（有缓存读缓存，无缓存调研后保存）。"""
    cached = _load_cache(product_name)
    if cached:
        return cached

    audience, persona = await run_audience_insight(product_name, product_info, market_info)
    _save_cache(product_name, audience, persona)

    return AudienceInsightResponse(
        product_name=product_name,
        audience_data=audience,
        persona=persona,
        from_cache=False,
    )


async def stream_audience_insight(
    product_name: str,
    product_info: dict | None = None,
    market_info: dict | None = None,
) -> AsyncGenerator[str, None]:
    """流式——通过 agent graph 的 astream_events 逐步推送 SSE 事件。"""
    # 1. 检查缓存
    cached = _load_cache(product_name)
    if cached:
        yield f"event: progress\ndata: {json.dumps({'step': 'cache', 'message': '读取缓存中...'})}\n\n"
        yield f"event: result\ndata: {cached.model_dump_json()}\n\n"
        return

    initial_state: dict[str, Any] = {
        "product_name": product_name,
        "product_info": product_info or {},
        "market_info": market_info or {},
        "search_results": [],
        "fetched_pages": [],
        "audience_data": None,
        "persona": None,
    }

    try:
        async for event in _graph.astream_events(initial_state, None, version="v2"):
            translated = _translate_audience_event(event, product_name)
            if translated is not None:
                yield translated
    except Exception as exc:
        yield f"event: error\ndata: {str(exc)}\n\n"


_NODE_SSE_MAP = {
    "search": {"step": "search", "done_step": "search_done"},
    "fetch": {"step": "fetch"},
    "extract_audience": {"step": "extract"},
    "generate_persona": {"step": "persona"},
}


def _translate_audience_event(event: dict, product_name: str) -> str | None:
    """Map astream_events v2 event to audience insight SSE frames."""
    ev_type = event.get("event")
    name: Any = event.get("name")
    data = event.get("data", {})

    node_info = _NODE_SSE_MAP.get(name)
    if node_info is None:
        return None

    if ev_type == "on_chain_start" and node_info:
        step = node_info["step"]
        msg = f"正在{ {'search': '搜索', 'fetch': '读取页面', 'extract': '提取人群数据', 'persona': '生成用户画像'}.get(step, step) } {product_name}..."
        if step == "fetch":
            msg = f"正在读取 {product_name} 的相关页面..."
        return f"event: progress\ndata: {json.dumps({'step': step, 'message': msg})}\n\n"

    if ev_type == "on_chain_end" and name in ("search",):
        step = node_info["step"]
        msg = f"正在{ {'search': '搜索', 'fetch': '读取页面', 'extract': '提取人群数据', 'persona': '生成用户画像'}.get(step, step) } {product_name}..."
        if step == "fetch":
            msg = f"正在读取 {product_name} 的相关页面..."
        return f"event: progress\ndata: {json.dumps({'step': step, 'message': msg})}\n\n"

    if ev_type == "on_chain_end" and name in ("search",):
        output = data.get("output", {})
        results = output.get("search_results", [])
        done_step = node_info["done_step"]
        return f"event: progress\ndata: {json.dumps({'step': done_step, 'message': f'找到 {len(results)} 个相关页面'})}\n\n"

    if ev_type == "on_chain_end" and name in ("fetch",):
        output = data.get("output", {})
        pages = output.get("fetched_pages", [])
        valid_count = sum(1 for p in pages if isinstance(p, dict) and p.get("fetched"))
        return f"event: progress\ndata: {json.dumps({'step': 'fetch_done', 'message': f'完成读取 {valid_count} 个页面'})}\n\n"

    if ev_type == "on_chain_end" and name == "LangGraph":
        output = data.get("output", {})
        audience = output.get("audience_data")
        persona = output.get("persona")
        if audience and persona:
            ad = AudienceRawData.model_validate(audience) if isinstance(audience, dict) else audience
            pp = UserPersona.model_validate(persona) if isinstance(persona, dict) else persona
            _save_cache(product_name, ad, pp)
            response = AudienceInsightResponse(
                product_name=product_name,
                audience_data=ad,
                persona=pp,
                from_cache=False,
            )
            return f"event: result\ndata: {response.model_dump_json()}\n\n"

    return None
