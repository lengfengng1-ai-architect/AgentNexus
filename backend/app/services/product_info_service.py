"""产品信息调研 Service。

负责缓存检查 → Agent 调研 → 结果持久化。
提供两种调用方式：普通（完整等结果）和流式（逐步推送进度）。
"""

import asyncio
import json
import re
from collections.abc import AsyncGenerator
from pathlib import Path

from app.agents.product_research_agent import (
    ProductResearchState,
    enrich_website_node,
    extract_node,
    fetch_node,
    research_product,
    search_node,
)
from app.schemas.product_info import ProductResearchResult, ProductInfoResponse

MOCK_DATA_DIR = Path("mock_data") / "product_info"


def _sanitize_filename(name: str) -> str:
    safe = re.sub(r'[^\w一-鿿]+', "_", name).strip("_").lower()
    return safe if safe else "unknown"


def _cache_path(product_name: str) -> Path:
    return MOCK_DATA_DIR / f"{_sanitize_filename(product_name)}.json"


def _load_from_cache(product_name: str) -> ProductInfoResponse | None:
    path = _cache_path(product_name)
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        return ProductInfoResponse(
            product_info=ProductResearchResult.model_validate(data),
            from_cache=True,
        )
    return None


def _save_to_cache(product_name: str, info: ProductResearchResult) -> None:
    MOCK_DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = _cache_path(product_name)
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
    """流式——逐步推送 SSE 事件。"""
    # 1. 检查缓存
    cached = _load_from_cache(product_name)
    if cached:
        yield f"event: progress\ndata: {json.dumps({'step': 'cache', 'message': '读取缓存中...'})}\n\n"
        yield f"event: result\ndata: {cached.model_dump_json()}\n\n"
        return

    # 2. 搜索
    yield f"event: progress\ndata: {json.dumps({'step': 'search', 'message': f'正在搜索 {product_name} 的产品信息...'})}\n\n"
    state = ProductResearchState(product_name=product_name)
    result = await search_node(state)
    state.search_results = result["search_results"]
    yield f"event: progress\ndata: {json.dumps({'step': 'search_done', 'message': f'找到 {len(state.search_results)} 个相关页面'})}\n\n"

    # 3. 读页
    result = await fetch_node(state)
    state.fetched_pages = result["fetched_pages"]
    valid = [p for p in state.fetched_pages if p.fetched]
    for i, page in enumerate(valid):
        title = page.title or page.url
        yield f"event: progress\ndata: {json.dumps({'step': 'fetch', 'index': i + 1, 'total': len(valid), 'message': f'正在读取 ({i+1}/{len(valid)}): {title}', 'url': page.url})}\n\n"
        await asyncio.sleep(0)  # 给事件循环机会发送

    # 4. 提取
    yield f"event: progress\ndata: {json.dumps({'step': 'extract', 'message': 'LLM 正在提取结构化信息...'})}\n\n"
    result = await extract_node(state)
    state.output = result["output"]

    # 5. 补充官网
    yield f"event: progress\ndata: {json.dumps({'step': 'enrich', 'message': '正在补充官网信息...'})}\n\n"
    result = await enrich_website_node(state)
    state.output = result.get("output", state.output)

    # 6. 保存
    _save_to_cache(product_name, state.output)
    response = ProductInfoResponse(product_info=state.output, from_cache=False)

    yield f"event: result\ndata: {response.model_dump_json()}\n\n"
