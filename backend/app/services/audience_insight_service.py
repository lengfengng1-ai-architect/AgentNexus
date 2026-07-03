"""人群洞察 Service。

两层结构：
  mock_data/audience_insight/  — 人群调研原始数据
  mock_data/user_persona/      — 用户画像
"""

import asyncio
import json
import re
from collections.abc import AsyncGenerator
from pathlib import Path

from app.agents.audience_insight_agent import (
    State,
    extract_audience_node,
    fetch_node,
    generate_persona_node,
    run_audience_insight,
    search_node,
)
from app.schemas.audience_insight import (
    AudienceInsightResponse,
    AudienceRawData,
    UserPersona,
)

AUDIENCE_DIR = Path("mock_data") / "audience_insight"
PERSONA_DIR = Path("mock_data") / "user_persona"


def _sanitize(name: str) -> str:
    safe = re.sub(r'[^\w一-鿿]+', "_", name).strip("_").lower()
    return safe if safe else "unknown"


def _audience_path(product_name: str) -> Path:
    return AUDIENCE_DIR / f"{_sanitize(product_name)}.json"


def _persona_path(product_name: str) -> Path:
    return PERSONA_DIR / f"{_sanitize(product_name)}.json"


def _load_cache(product_name: str) -> AudienceInsightResponse | None:
    ap = _audience_path(product_name)
    pp = _persona_path(product_name)
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
    _audience_path(product_name).write_text(audience.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8")
    _persona_path(product_name).write_text(persona.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8")


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
    """流式——逐步推送 SSE 事件。"""
    # 1. 检查缓存
    cached = _load_cache(product_name)
    if cached:
        yield f"event: progress\ndata: {json.dumps({'step': 'cache', 'message': '读取缓存中...'})}\n\n"
        yield f"event: result\ndata: {cached.model_dump_json()}\n\n"
        return

    # 2. 搜索
    yield f"event: progress\ndata: {json.dumps({'step': 'search', 'message': f'正在搜索 {product_name} 的目标人群信息...'})}\n\n"
    state = State(product_name=product_name, product_info=product_info or {}, market_info=market_info or {})
    result = await search_node(state)
    state.search_results = result["search_results"]
    yield f"event: progress\ndata: {json.dumps({'step': 'search_done', 'message': f'找到 {len(state.search_results)} 个相关页面'})}\n\n"

    # 3. 读页
    result = await fetch_node(state)
    state.fetched_pages = result["fetched_pages"]
    valid = [p for p in state.fetched_pages if p.fetched]
    for i, page in enumerate(valid):
        title = page.title or page.url
        yield f"event: progress\ndata: {json.dumps({'step': 'fetch', 'index': i + 1, 'total': len(valid), 'message': f'正在读取 ({i+1}/{len(valid)}): {title}'})}\n\n"
        await asyncio.sleep(0)

    # 4. 提取人群数据
    yield f"event: progress\ndata: {json.dumps({'step': 'extract', 'message': 'LLM 正在提取人群数据...'})}\n\n"
    result = await extract_audience_node(state)
    state.audience_data = result["audience_data"]

    # 5. 生成用户画像
    yield f"event: progress\ndata: {json.dumps({'step': 'persona', 'message': 'LLM 正在生成用户画像...'})}\n\n"
    result = await generate_persona_node(state)
    state.persona = result["persona"]

    # 6. 保存
    _save_cache(product_name, state.audience_data, state.persona)
    response = AudienceInsightResponse(
        product_name=product_name,
        audience_data=state.audience_data,
        persona=state.persona,
        from_cache=False,
    )

    yield f"event: result\ndata: {response.model_dump_json()}\n\n"
