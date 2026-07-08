"""Plan data query agent for plan generation pipeline.

通过 Web 搜索 + LLM 结构化提取城市运动数据（盟域/赛事/达人/经营社/场馆），
取代原来的 mock JSON 读取。

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
Corresponding in_scope ID: plan-generation
"""

import asyncio
from typing import Any

from bs4 import BeautifulSoup
from httpx import AsyncClient, HTTPError, TimeoutException

from app.agents.llm_utils import build_chat_model, searxng_search, write_log
from app.agents.registry import register
from app.schemas.plan_generation import (
    CityDataOutput,
    EventData,
    InfluencerData,
    InfluencerTiers,
    LeagueData,
    StoreData,
    VenueData,
)
from app.utils import extract_text_from_html

SEARCH_MAX = 8
FETCH_TOP = 5
FETCH_TIMEOUT = 15
MAX_PAGE_CHARS = 8000


async def _search_city(city: str) -> list[dict[str, str]]:
    """用多关键词并行搜索某城市的运动/体育数据。"""
    keywords = [
        f"{city} 运动人口 体育消费",
        f"{city} 运动社群 盟域 赛事活动",
        f"{city} 运动达人 KOL 健身",
        f"{city} 运动场馆 体育设施 经营社",
    ]
    results: list[dict[str, str]] = []
    seen: set[str] = set()

    async def _search_one(kw: str) -> list[dict[str, str]]:
        try:
            return await searxng_search(kw, max_results=SEARCH_MAX)
        except Exception:
            write_log("plan_data_query", f"⚠️ 关键词「{kw}」搜索失败，跳过")
            return []

    batches = await asyncio.gather(*[_search_one(kw) for kw in keywords])
    for raw in batches:
        for item in raw:
            url = item.get("url", "") or item.get("href", "")
            if url and url not in seen:
                seen.add(url)
                results.append(item)
    write_log("plan_data_query", f"🔍 搜索完成，获得 {len(results)} 条相关结果")
    return results


async def _fetch_pages(results: list[dict[str, str]]) -> list[dict[str, Any]]:
    """并发抓取搜索结果的页面内容。"""
    pages: list[dict[str, Any]] = []

    async def _fetch_one(item: dict[str, str]) -> dict[str, Any] | None:
        url = item.get("href", "")
        if not url:
            return None
        try:
            async with AsyncClient(timeout=FETCH_TIMEOUT) as client:
                resp = await client.get(url, follow_redirects=True)
                resp.raise_for_status()
                content_type = resp.headers.get("content-type", "")
                if "text/html" not in content_type and "application/json" not in content_type:
                    return None
                text = extract_text_from_html(resp.text) if "text/html" in content_type else resp.text
                if len(text) > MAX_PAGE_CHARS:
                    text = text[:MAX_PAGE_CHARS] + "\n...[截断]"
                if len(text) < 200:
                    return None
                return {"url": url, "title": item.get("title", ""), "content": text}
        except (TimeoutException, HTTPError, Exception):
            return None

    tasks = [_fetch_one(r) for r in results[:FETCH_TOP]]
    fetched = await asyncio.gather(*tasks)
    pages = [f for f in fetched if f is not None]
    write_log("plan_data_query", f"📄 抓取完成：成功 {len(pages)} 个页面")
    return pages


async def run_plan_data_query(state: dict[str, Any]) -> dict[str, Any]:
    """通过搜索 + LLM 提取目标城市的运动数据，返回 CityDataOutput。"""
    city = state.get("city") or state.get("brand_input", {}).get("city")
    if not city:
        raise ValueError("缺少必填字段: city")

    write_log("plan_data_query", f"🔍 正在搜索 {city} 的运动数据…")
    results = await _search_city(city)
    pages = await _fetch_pages(results)

    if not pages:
        write_log("plan_data_query", "⚠️ 没有抓取到有效页面，将用 AI 生成估算数据")
        pages_content = "无公开数据"
    else:
        pages_content = "\n\n".join(
            f"--- {p['title']} ({p['url']}) ---\n{p['content'][:3000]}"
            for p in pages
        )

    write_log("plan_data_query", f"🤖 正在用 AI 提取 {city} 的结构化运动数据…")

    prompt = (
        f"你是一个专业的体育产业数据分析师。请根据以下关于「{city}」的公开网页信息，"
        f"提取该城市的运动产业结构化数据。\n"
        f"对于无法从搜索结果中获取的数据项，请根据公开统计数据和城市规模进行合理估算，"
        f"并在备注中注明「估算」。\n"
        f"数据必须尽可能真实和准确。\n\n"
        f"网页信息：\n{pages_content}\n\n"
        f"请填写 {city} 的城市运动数据。"
    )

    llm = build_chat_model().with_structured_output(CityDataOutput)
    result: CityDataOutput = await llm.ainvoke([
        {"role": "system", "content": prompt},
        {"role": "user", "content": f"请提取「{city}」的运动产业数据。"},
    ])

    write_log("plan_data_query", f"✓ {city} 数据提取完成")
    return result.model_dump()


register("plan_data_query", run_plan_data_query)
