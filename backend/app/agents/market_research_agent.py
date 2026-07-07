"""Market research agent for plan generation pipeline.

Rewritten: pure-LLM 7-chain replaced by web search → fetch → extract.
Corresponding OpenSpec: openspec/changes/market-research-web-search/
Corresponding in_scope ID: plan-generation
"""

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup
from httpx import AsyncClient, HTTPError, TimeoutException
from jinja2 import Environment, FileSystemLoader
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.llm_utils import build_chat_model, duckduckgo_search, write_log
from app.agents.registry import register
from app.schemas.plan_generation import MarketResearchOutput, MarketTrend

logger = logging.getLogger(__name__)

# ── Constants ──
FETCH_TIMEOUT = 15
MAX_PAGE_CHARS = 8000
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
SKIP_EXTENSIONS = {'.pdf', '.doc', '.docx', '.zip', '.jpg', '.png', '.gif', '.ppt', '.pptx', '.xls', '.xlsx'}
SEARCH_QUERIES = [
    "{category} 产业链 上游 下游",         # market_definition
    "{category} 市场规模 增长率",           # market_size
    "{category} 行业趋势",                  # trends
    "{category} 市场机会 投资 前景",         # opportunities
]

# ── Helpers ──


def _category_slug(category: str) -> str:
    """Normalize category name to a mock-data file name."""
    return category.strip().lower().replace(" ", "_")


def _load_mock_data(category: str) -> dict[str, Any] | None:
    """Load preset mock data for category, or None if not found."""
    mock_dir = Path("mock_data") / "market_research"
    # Try exact match first, then slug match
    for candidate in (f"{category}.json", f"{_category_slug(category)}.json"):
        path = mock_dir / candidate
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except Exception as exc:
                logger.warning("failed to load mock data %s: %s", path, exc)
                return None

    # Try listing files and fuzzy match by name
    if mock_dir.is_dir():
        for f in mock_dir.iterdir():
            if f.suffix == ".json":
                stem = f.stem
                if any(kw in stem for kw in (category[:4], _category_slug(category)[:4])):
                    try:
                        return json.loads(f.read_text(encoding="utf-8"))
                    except Exception:
                        continue
    return None


def _build_output(
    market_summary: str,
    trends_raw: list[dict[str, Any]],
    opportunities: list[str],
) -> MarketResearchOutput:
    trends = []
    for t in trends_raw[:5]:
        trends.append(MarketTrend(
            title=t.get("title", t.get("title", "")),
            description=t.get("summary", t.get("description", "")),
        ))
    return MarketResearchOutput(
        market_summary=market_summary,
        trends=trends,
        opportunities=opportunities[:5],
    )


# ── Search ──


async def _search(category: str) -> list[dict[str, str]]:
    """Run 4 keyword searches in parallel, deduplicate by URL."""
    keywords = [q.format(category=category) for q in SEARCH_QUERIES]
    write_log("market_research", f"🔍 正在用 {len(keywords)} 个关键词搜索市场信息…")

    async def search_one(kw: str) -> list[dict[str, str]]:
        try:
            return await duckduckgo_search(kw, max_results=8)
        except Exception:
            write_log("market_research", f"⚠️ 关键词「{kw}」搜索失败，跳过")
            return []

    results = await asyncio.gather(*[search_one(kw) for kw in keywords])
    seen: set[str] = set()
    deduped: list[dict[str, str]] = []
    for batch in results:
        for item in batch:
            url = item.get("href", "")
            if url and url not in seen:
                seen.add(url)
                # Filter out binary/datasheet URLs
                path_part = url.split("?")[0].lower()
                if any(path_part.endswith(ext) for ext in SKIP_EXTENSIONS):
                    continue
                deduped.append(item)

    write_log("market_research", f"📄 搜索完成，获得 {len(deduped)} 条去重结果")
    return deduped


# ── Fetch ──


async def _fetch(pages: list[dict[str, str]]) -> list[dict[str, Any]]:
    """Concurrently fetch page content from search results."""
    urls = [p["href"] for p in pages]
    write_log("market_research", f"📄 开始并发抓取 {len(urls)} 个页面…")

    async def fetch_one(url: str) -> dict[str, Any]:
        write_log("market_research", f"📄 正在请求 {url}…")
        try:
            async with AsyncClient(timeout=FETCH_TIMEOUT) as client:
                resp = await client.get(url, headers={"User-Agent": USER_AGENT}, follow_redirects=True)
                resp.raise_for_status()
                if "text/html" not in resp.headers.get("content-type", "") and "application/xhtml" not in resp.headers.get("content-type", ""):
                    write_log("market_research", f"⚠️ {url} 非 HTML 内容，跳过")
                    return {"url": url, "title": None, "content": "", "fetched": False}
                raw = resp.text
                soup = BeautifulSoup(raw, "lxml")
                title = soup.title.string.strip() if soup.title and soup.title.string else None
                # Extract readable text
                for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
                    tag.decompose()
                text = soup.get_text(separator="\n", strip=True)
                if len(text) > MAX_PAGE_CHARS:
                    text = text[:MAX_PAGE_CHARS] + "\n...[内容截断]"
                write_log("market_research", f"✓ 成功读取 {url}（{len(text)} 字符）")
                return {"url": url, "title": title, "content": text, "fetched": True}
        except TimeoutException:
            write_log("market_research", f"⏱️ {url} 请求超时，跳过")
            return {"url": url, "title": None, "content": "", "fetched": False}
        except HTTPError:
            write_log("market_research", f"⚠️ {url} HTTP 错误，跳过")
            return {"url": url, "title": None, "content": "", "fetched": False}
        except Exception:
            write_log("market_research", f"⚠️ {url} 读取失败，跳过")
            return {"url": url, "title": None, "content": "", "fetched": False}

    tasks = [fetch_one(url) for url in urls]
    results = await asyncio.gather(*tasks)
    fetched_count = sum(1 for r in results if r["fetched"])
    write_log("market_research", f"📄 抓取完成：成功 {fetched_count}/{len(results)} 个页面")
    return results


# ── Extract ──


async def _extract(
    brand_name: str,
    category: str,
    fetched_pages: list[dict[str, Any]],
) -> MarketResearchOutput:
    """Single LLM call: extract structured market research from fetched pages."""
    valid_pages = [p for p in fetched_pages if p["fetched"] and p["content"]]
    if not valid_pages:
        write_log("market_research", "⚠️ 没有有效页面内容可供分析")
        return MarketResearchOutput(
            market_summary=f"{brand_name} 所在的 {category} 市场：未找到市场信息",
            trends=[],
            opportunities=[],
        )

    write_log("market_research", f"🤖 正在用 AI 分析 {len(valid_pages)} 个页面的内容，提取结构化市场信息…")

    env = Environment(loader=FileSystemLoader("app/prompt_templates"))
    prompt = env.get_template("market_research_extract.md.j2").render(
        market_name=brand_name,
        category=category,
        fetched_pages=valid_pages,
    )

    llm = build_chat_model()

    try:
        result = await llm.with_structured_output(_ExtractionResult).ainvoke([
            SystemMessage(content=prompt),
            HumanMessage(content=f"请对「{brand_name}」所在「{category}」市场进行调研分析。"),
        ])
    except Exception as exc:
        logger.warning("market_research extraction failed: %s", exc)
        write_log("market_research", "⚠️ AI 提取失败，返回空结果")
        return MarketResearchOutput(
            market_summary=f"{brand_name} 所在的 {category} 市场：分析失败",
            trends=[],
            opportunities=[],
        )

    write_log("market_research", "🤖 AI 提取完成")

    # Build summary from definition + size
    def_notes = result.market_definition.definition_notes or ""
    size_str = ""
    if result.market_size and result.market_size.tam and result.market_size.tam.value:
        site = result.market_size.tam.source_url or ""
        size_str = f"市场规模约{result.market_size.tam.value}亿元"
        if result.market_size.cagr:
            size_str += f"，CAGR {result.market_size.cagr}%"
        if site:
            size_str += f"（{site}）"
    if size_str:
        market_summary = f"{brand_name} 所在的 {category} 市场：{def_notes} {size_str}"
    else:
        market_summary = f"{brand_name} 所在的 {category} 市场分析：{def_notes}"

    # Build trends
    trends_raw = []
    for t in result.trends:
        trends_raw.append({"title": t.title, "summary": t.summary})

    # Build opportunities
    opportunities_raw = [o for o in result.opportunities.key_opportunities if o]

    write_log("market_research", f"✓ 提取到 {len(trends_raw)} 条趋势、{len(opportunities_raw)} 个机会点")

    return _build_output(
        market_summary=market_summary[:300],
        trends_raw=trends_raw,
        opportunities=opportunities_raw,
    )


# ── Pydantic schema for structured extraction ──


from pydantic import BaseModel, Field


class _MarketSizeItem(BaseModel):
    value: float | None = None
    year: int | None = None
    source_url: str | None = None


class _MarketDefinition(BaseModel):
    included_scope: list[str] = Field(default_factory=list)
    excluded_scope: list[str] = Field(default_factory=list)
    upstream: list[str] = Field(default_factory=list)
    downstream: list[str] = Field(default_factory=list)
    substitute_solutions: list[str] = Field(default_factory=list)
    definition_notes: str = ""


class _Trend(BaseModel):
    signal_type: str = ""
    title: str = ""
    summary: str = ""
    impact: str = "positive"


class _OpportunityAssessment(BaseModel):
    key_opportunities: list[str] = Field(default_factory=list)
    key_risks: list[str] = Field(default_factory=list)
    market_attractiveness: str = ""
    competition_intensity: str = ""
    entry_difficulty: str = ""


class _ExtractionResult(BaseModel):
    market_definition: _MarketDefinition = Field(default_factory=_MarketDefinition)
    market_size: _MarketSize = Field(default_factory=lambda: _MarketSize())
    trends: list[_Trend] = Field(default_factory=list)
    opportunities: _OpportunityAssessment = Field(default_factory=_OpportunityAssessment)


class _MarketSize(BaseModel):
    tam: _MarketSizeItem = Field(default_factory=_MarketSizeItem)
    sam: _MarketSizeItem = Field(default_factory=_MarketSizeItem)
    som: _MarketSizeItem = Field(default_factory=_MarketSizeItem)
    cagr: float | None = None
    cagr_period: str = ""
    conflict_notes: str = ""


# ── Entry Point ──


async def run_market_research(state: dict[str, Any]) -> dict[str, Any]:
    """Run market research for plan generation and return structured output.

    Three modes:
    1. Mock mode (USE_MOCK_DATA=true): reads preset data from mock_data/market_research/
    2. Normal mode: web search → fetch → extract
    """
    brand_name = state.get("brand_name") or state.get("brand_input", {}).get("brand_name")
    category = state.get("category") or state.get("brand_input", {}).get("category")
    if not brand_name or not category:
        raise ValueError("Missing required inputs: brand_name and category")

    write_log("market_research", f"🔍 开始对 {brand_name}（{category}）进行市场分析…")

    # ── Mock mode ──
    if os.environ.get("USE_MOCK_DATA") == "true":
        mock_data = _load_mock_data(category)
        if mock_data:
            write_log("market_research", "📂 使用 mock 数据（USE_MOCK_DATA=true）")
            output = MarketResearchOutput.model_validate(mock_data)
            write_log("market_research", "✓ 市场分析完成（mock）")
            return output.model_dump()
        else:
            write_log("market_research", f"⚠️ 未找到 {category} 的 mock 数据，返回空结果")
            output = MarketResearchOutput(
                market_summary=f"{brand_name} 所在的 {category} 市场：未配置 mock 数据",
                trends=[],
                opportunities=[],
            )
            write_log("market_research", "✓ 市场分析完成（mock-空）")
            return output.model_dump()

    # ── Real mode: search → fetch → extract ──
    search_results = await _search(category)
    if not search_results:
        write_log("market_research", "⚠️ 搜索未返回结果")
        output = MarketResearchOutput(
            market_summary=f"{brand_name} 所在的 {category} 市场：搜索未返回市场信息",
            trends=[],
            opportunities=[],
        )
        write_log("market_research", "✓ 市场分析完成（无搜索结果）")
        return output.model_dump()

    fetched_pages = await _fetch(search_results)
    output = await _extract(brand_name, category, fetched_pages)

    write_log("market_research", "✓ 市场分析完成")
    return output.model_dump()


register("market_research", run_market_research)
