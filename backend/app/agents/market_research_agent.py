"""Market research agent for plan generation pipeline.

Rewritten: pure-LLM 7-chain replaced by web search → fetch → ReAct → extract.
Corresponding OpenSpec: changes/insight-market-react-research/
Corresponding in_scope ID: plan-generation
"""

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Annotated, Any

from bs4 import BeautifulSoup
from functools import cache
from httpx import AsyncClient, HTTPError, TimeoutException
from jinja2 import Environment, FileSystemLoader
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import END, StateGraph, add_messages
from langgraph.prebuilt import ToolNode
from pydantic import BaseModel, Field
from urllib.parse import urlparse

from app.agents.llm_utils import build_chat_model, searxng_search, write_log
from app.agents.registry import register
from app.agents.tools import web_fetch_tool, web_search_tool
from app.schemas.plan_generation import MarketResearchOutput, MarketTrend

logger = logging.getLogger(__name__)

# ── Constants ──
FETCH_TIMEOUT = 10
FETCH_TOP = 25
MAX_PAGE_CHARS = 4000
FETCH_CONCURRENCY = 8
MAX_TOOL_ROUNDS = 3
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
SKIP_EXTENSIONS = {'.pdf', '.doc', '.docx', '.zip', '.jpg', '.png', '.gif', '.ppt', '.pptx', '.xls', '.xlsx'}
# 已知 403 屏蔽爬虫的域名，在搜索去重阶段跳过
BLOCKED_DOMAINS = {"zhuanlan.zhihu.com", "baike.baidu.com", "wenku.baidu.com"}
SEARCH_QUERIES = [
    "{category} 产业链 上游 下游",                   # 品类全貌
    "{category} 市场规模 增长率",                     # 品类市场规模
    "{category} 行业趋势 {brand_name}",               # 品类趋势，品牌辅助
    "{category} 市场机会 竞争 {brand_name}",           # 品类竞争格局，品牌辅助
]

# ── State ──


class State(BaseModel):
    brand_name: str = ""
    category: str = ""
    search_results: list[dict] = Field(default_factory=list)
    fetched_pages: list[dict] = Field(default_factory=list)
    # ReAct 对话与计数
    messages: Annotated[list, add_messages] = Field(default_factory=list)
    tool_call_count: int = 0
    output: MarketResearchOutput | None = None


# ── Helpers ──


@cache
def _build_model():
    return build_chat_model()


def _category_slug(category: str) -> str:
    """Normalize category name to a mock-data file name."""
    return category.strip().lower().replace(" ", "_")


def _load_mock_data(category: str) -> dict[str, Any] | None:
    """Load preset mock data for category, or None if not found."""
    mock_dir = Path("mock_data") / "market_research"
    for candidate in (f"{category}.json", f"{_category_slug(category)}.json"):
        path = mock_dir / candidate
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except Exception as exc:
                logger.warning("failed to load mock data %s: %s", path, exc)
                return None

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


# ── Node: Search ──


async def _search(category: str, brand_name: str = "") -> list[dict[str, str]]:
    """Run 4 keyword searches in parallel, deduplicate by URL."""
    keywords = [q.format(category=category, brand_name=brand_name) for q in SEARCH_QUERIES]
    write_log("market_research", f"🔍 正在用 {len(keywords)} 个关键词搜索市场信息…")

    async def search_one(kw: str) -> list[dict[str, str]]:
        try:
            return await searxng_search(kw, max_results=8)
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
                path_part = url.split("?")[0].lower()
                if any(path_part.endswith(ext) for ext in SKIP_EXTENSIONS):
                    continue
                hostname = urlparse(url).hostname or ""
                if hostname in BLOCKED_DOMAINS:
                    continue
                deduped.append(item)

    write_log("market_research", f"📄 搜索完成，获得 {len(deduped)} 条去重结果")
    return deduped


async def search_node(state: State) -> dict:
    """搜索市场信息（关键词并行）。"""
    results = await _search(state.category, state.brand_name)
    return {"search_results": results}


# ── Node: Fetch ──


async def _fetch(pages: list[dict[str, str]]) -> list[dict[str, Any]]:
    """Concurrently fetch page content from search results."""
    urls = [p["href"] for p in pages[:FETCH_TOP]]
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
                for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
                    tag.decompose()
                text = soup.get_text(separator="\n", strip=True)
                if len(text) > MAX_PAGE_CHARS:
                    text = text[:MAX_PAGE_CHARS] + "\n...[内容截断]"
                write_log("market_research", f"✓ 成功读取 {url}（{len(text)} 字符）")
                return {"url": url, "title": title, "content": text, "fetched": True}
        except TimeoutException as exc:
            logger.warning("market_research timeout: %s (%s)", url, exc)
            write_log("market_research", f"⏱️ {url} 请求超时，跳过")
            return {"url": url, "title": None, "content": "", "fetched": False}
        except HTTPError as exc:
            logger.warning("market_research HTTP error: %s (%s)", url, exc)
            write_log("market_research", f"⚠️ {url} HTTP 错误，跳过")
            return {"url": url, "title": None, "content": "", "fetched": False}
        except Exception:
            logger.exception("market_research fetch failed: %s", url)
            write_log("market_research", f"⚠️ {url} 读取失败，跳过")
            return {"url": url, "title": None, "content": "", "fetched": False}

    tasks = [fetch_one(url) for url in urls]
    sem = asyncio.Semaphore(FETCH_CONCURRENCY)

    async def wrapped(url: str) -> dict[str, Any]:
        async with sem:
            return await fetch_one(url)

    results = await asyncio.gather(*[wrapped(url) for url in urls])
    fetched_count = sum(1 for r in results if r["fetched"])
    write_log("market_research", f"📄 抓取完成：成功 {fetched_count}/{len(results)} 个页面")
    return results


async def fetch_node(state: State) -> dict:
    """并发读取页面内容。"""
    pages = await _fetch(state.search_results)
    return {"fetched_pages": pages}


# ── Node: Init ReAct ──


async def init_react_node(state: State) -> dict:
    """初始化 ReAct 对话：将批量抓取的页面内容注入 system prompt。"""
    valid = [p for p in state.fetched_pages if p.get("fetched") and p.get("content")]
    env = Environment(loader=FileSystemLoader("app/prompt_templates"))
    prompt = env.get_template("market_research_react.md.j2").render(
        market_name=state.brand_name,
        category=state.category,
        fetched_pages=valid,
    )
    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content=f"请对「{state.category}」品类进行市场调研分析，以「{state.brand_name}」作为具体参考品牌。"),
    ]
    write_log("market_research", f"🚀 进入 ReAct 阶段（已有 {len(valid)} 个有效页面）")
    return {"messages": messages, "tool_call_count": 0}


# ── Node: ReAct Agent ──


async def agent_node(state: State) -> dict:
    """ReAct agent：绑定 web_search/web_fetch 工具，基于已有页面内容决定是否补充搜索。"""
    new_count = state.tool_call_count
    if state.messages and isinstance(state.messages[-1], ToolMessage):
        new_count = state.tool_call_count + 1
        write_log("market_research", f"🛠️ ReAct 工具调用累计 {new_count}/{MAX_TOOL_ROUNDS} 轮")

    llm = _build_model().bind_tools([web_search_tool, web_fetch_tool])
    response = await llm.ainvoke(list(state.messages))
    return {"messages": [response], "tool_call_count": new_count}


def _route_after_agent(state: State) -> str:
    """agent 之后：有工具调用且未超轮次 → tools；否则 → extract。"""
    last = state.messages[-1] if state.messages else None
    if not (last and getattr(last, "tool_calls", None)):
        return "extract"
    if state.tool_call_count >= MAX_TOOL_ROUNDS:
        return "extract"
    return "tools"


# ── Extract helpers (Pydantic schemas for structured output) ──


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


# ── Node: Extract ──


async def _extract(
    brand_name: str,
    category: str,
    fetched_pages: list[dict[str, Any]],
) -> MarketResearchOutput:
    """Single LLM call: extract structured market research from fetched pages."""
    valid_pages = [p for p in fetched_pages if p.get("fetched") and p.get("content")]
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

    trends_raw = []
    for t in result.trends:
        trends_raw.append({"title": t.title, "summary": t.summary})

    opportunities_raw = [o for o in result.opportunities.key_opportunities if o]

    write_log("market_research", f"✓ 提取到 {len(trends_raw)} 条趋势、{len(opportunities_raw)} 个机会点")

    return _build_output(
        market_summary=market_summary[:300],
        trends_raw=trends_raw,
        opportunities=opportunities_raw,
    )


async def extract_node(state: State) -> dict:
    """从页面内容提取结构化市场信息。"""
    output = await _extract(state.brand_name, state.category, state.fetched_pages)
    return {"output": output}


# ── Graph ──


def _build_graph():
    graph = StateGraph(State)

    graph.add_node("search", search_node)
    graph.add_node("fetch", fetch_node)
    graph.add_node("init_react", init_react_node)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", ToolNode([web_search_tool, web_fetch_tool]))
    graph.add_node("extract", extract_node)

    graph.set_entry_point("search")
    graph.add_edge("search", "fetch")
    graph.add_edge("fetch", "init_react")
    graph.add_edge("init_react", "agent")
    graph.add_conditional_edges(
        "agent", _route_after_agent, {"tools": "tools", "extract": "extract"}
    )
    graph.add_edge("tools", "agent")
    graph.add_edge("extract", END)

    return graph.compile()


_graph = _build_graph()


# ── Entry Point ──


async def run_market_research(state: dict[str, Any]) -> dict[str, Any]:
    """Run market research for plan generation and return structured output.

    Three modes:
    1. Mock mode (USE_MOCK_DATA=true): reads preset data from mock_data/market_research/
    2. Normal mode: web search → fetch → ReAct → extract (via LangGraph)
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

    # ── Real mode: LangGraph ──
    result = await _graph.ainvoke({
        "brand_name": brand_name,
        "category": category,
    })
    output = result.get("output")
    if output is None:
        raise ValueError("Market research agent did not return structured output")

    write_log("market_research", "✓ 市场分析完成")
    return output.model_dump()


register("market_research", run_market_research)
