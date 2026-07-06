"""产品信息调研 Service — 通过 agent 的 StateGraph.astream_events() 消费。

负责缓存检查 → Agent 调研 → 结果持久化。
提供两种调用方式：普通（完整等结果）和流式（逐步推送进度）。
"""

import json
from collections.abc import AsyncGenerator
from typing import Any

from app.agents.product_research_agent import _graph, research_product
from app.config.cache_paths import PRODUCT_INFO_DIR, product_info_path
from app.schemas.product_info import ProductResearchResult, ProductInfoResponse


def _load_from_cache(product_name: str) -> ProductInfoResponse | None:
    path = product_info_path(product_name)
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        return ProductInfoResponse(
            product_info=ProductResearchResult.model_validate(data),
            from_cache=True,
        )
    return None


def _save_to_cache(product_name: str, info: ProductResearchResult) -> None:
    PRODUCT_INFO_DIR.mkdir(parents=True, exist_ok=True)
    path = product_info_path(product_name)
    path.write_text(info.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8")


async def get_product_info(product_name: str) -> ProductInfoResponse:
    """非流式——完整等结果。"""
    cached = _load_from_cache(product_name)
    if cached:
        return cached

    info = await research_product(product_name)
    _save_to_cache(product_name, info)

    return ProductInfoResponse(product_info=info, from_cache=False)


async def stream_product_info(product_name: str) -> AsyncGenerator[str, None]:
    """流式——通过 agent graph 的 astream_events 逐步推送 SSE 事件。"""
    # 1. 检查缓存
    cached = _load_from_cache(product_name)
    if cached:
        yield f"event: progress\ndata: {json.dumps({'step': 'cache', 'message': '读取缓存中...'})}\n\n"
        yield f"event: result\ndata: {cached.model_dump_json()}\n\n"
        return

    initial_state = {"product_name": product_name}

    try:
        async for event in _graph.astream_events(initial_state, None, version="v2"):
            translated = _translate_product_event(event, product_name)
            if translated is not None:
                yield translated
    except Exception as exc:
        yield f"event: error\ndata: {str(exc)}\n\n"


_NODE_STEPS = {
    "search": "search",
    "fetch": "fetch",
    "extract": "extract",
    "enrich_website": "enrich",
}


def _translate_product_event(event: dict, product_name: str) -> str | None:
    """Map astream_events v2 event to product info SSE frames."""
    ev_type = event.get("event")
    name: Any = event.get("name")
    data = event.get("data", {})

    step = _NODE_STEPS.get(name)
    if step is None:
        return None

    if ev_type == "on_chain_start" and step:
        if step == "search":
            return f"event: progress\ndata: {json.dumps({'step': 'search', 'message': f'正在搜索 {product_name} 的产品信息...'})}\n\n"
        if step == "fetch":
            return f"event: progress\ndata: {json.dumps({'step': 'fetch', 'message': f'正在读取页面...'})}\n\n"
        if step == "extract":
            return f"event: progress\ndata: {json.dumps({'step': 'extract', 'message': 'LLM 正在提取结构化信息...'})}\n\n"
        if step == "enrich":
            return f"event: progress\ndata: {json.dumps({'step': 'enrich', 'message': '正在补充官网信息...'})}\n\n"

    if ev_type == "on_chain_end" and name == "search":
        output = data.get("output", {})
        results = output.get("search_results", [])
        count = len(results) if isinstance(results, list) else 0
        return f"event: progress\ndata: {json.dumps({'step': 'search_done', 'message': f'找到 {count} 个相关页面'})}\n\n"

    if ev_type == "on_chain_end" and name == "fetch":
        output = data.get("output", {})
        pages = output.get("fetched_pages", [])
        valid = [p for p in pages if isinstance(p, dict) and p.get("fetched")]
        details = []
        for i, p in enumerate(valid):
            title = p.get("title") or p.get("url", "")
            details.append(f"event: progress\ndata: {json.dumps({'step': 'fetch', 'index': i + 1, 'total': len(valid), 'message': f'正在读取 ({i+1}/{len(valid)}): {title}', 'url': p.get('url', '')})}\n\n")
        return "".join(details) if details else None

    if ev_type == "on_chain_end" and name == "LangGraph":
        output = data.get("output", {})
        result = output.get("output")
        if result:
            if isinstance(result, dict):
                info = ProductResearchResult.model_validate(result)
                _save_to_cache(product_name, info)
                response = ProductInfoResponse(product_info=info, from_cache=False)
                return f"event: result\ndata: {response.model_dump_json()}\n\n"

    return None
