"""人群洞察 Agent

搜索目标产品的目标人群信息并生成用户画像。

superpowers in_scope ID: audience-insight
"""

import asyncio
import json
import logging
from functools import cache
from typing import Annotated, Any

from httpx import AsyncClient, HTTPError, TimeoutException
from bs4 import BeautifulSoup
from jinja2 import Environment, FileSystemLoader
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import END, StateGraph, add_messages
from langgraph.prebuilt import ToolNode
from pydantic import BaseModel, Field

from app.agents.llm_utils import build_chat_model, is_non_cn_url, searxng_search, write_log
from app.agents.registry import register
from app.agents.tools import web_fetch_tool, web_search_tool
from app.config.cache_paths import AUDIENCE_DIR, persona_path
from app.schemas.audience_insight import AudienceRawData, UserPersona
from app.utils import extract_text_from_html

logger = logging.getLogger(__name__)

# ── 常量 ──
SEARCH_MAX = 8
FETCH_TOP = 25
FETCH_TIMEOUT = 10
MAX_PAGE_CHARS = 4000
FETCH_CONCURRENCY = 8
MAX_TOOL_ROUNDS = 3
# 已知 403 屏蔽爬虫的域名，在搜索去重阶段跳过
BLOCKED_DOMAINS = {"zhuanlan.zhihu.com", "baike.baidu.com", "wenku.baidu.com"}
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


class SearchResult(BaseModel):
    url: str
    title: str
    snippet: str


class FetchedPage(BaseModel):
    url: str
    title: str | None
    content: str
    fetched: bool = True


class State(BaseModel):
    product_name: str
    category: str = ""
    product_info: dict = Field(default_factory=dict)
    market_info: dict = Field(default_factory=dict)
    search_results: list[SearchResult] = Field(default_factory=list)
    fetched_pages: list[FetchedPage] = Field(default_factory=list)
    # ReAct 对话与计数
    messages: Annotated[list, add_messages] = Field(default_factory=list)
    tool_call_count: int = 0
    audience_data: AudienceRawData | None = None
    persona: UserPersona | None = None


# ── 辅助 ──

@cache
def _build_model():
    return build_chat_model()


def _load_template(name: str, **kwargs) -> str:
    env = Environment(loader=FileSystemLoader("app/prompt_templates"))
    return env.get_template(name).render(**kwargs)


# ── 节点 ──


async def search_node(state: State) -> dict:
    """搜索目标人群信息（关键词并行）。"""
    product = state.product_name
    category = state.category or ""
    all_results: list[SearchResult] = []
    if category:
        keywords = [
            f"{category} 用户画像",                    # 品类级宽搜
            f"{category} 目标人群",                     # 品类级宽搜
            f"{product} {category} 消费者分析",         # 品牌+品类精准
            f"{product} {category} 购买人群",           # 品牌+品类精准
        ]
    else:
        keywords = [
            f"{product} 用户画像",
            f"{product} 目标人群",
            f"{product} 消费者分析",
            f"{product} 购买人群",
        ]
    seen: set[str] = set()

    write_log("audience_insight", f"🔍 正在用 {len(keywords)} 个关键词并行搜索…")

    async def search_one(kw: str) -> list[dict[str, str]]:
        try:
            return await searxng_search(kw, max_results=SEARCH_MAX)
        except Exception:
            write_log("audience_insight", f"⚠️ 关键词「{kw}」搜索失败，跳过")
            return []

    batches = await asyncio.gather(*[search_one(kw) for kw in keywords])

    for raw in batches:
        for item in raw:
            url = item.get("href", "")
            if url and url not in seen:
                seen.add(url)
                # Skip known 403 domains
                from urllib.parse import urlparse as _urlparse
                if _urlparse(url).hostname in BLOCKED_DOMAINS:
                    continue
                if is_non_cn_url(url):
                    continue
                all_results.append(SearchResult(url=url, title=item.get("title", ""), snippet=item.get("body", "")))

    write_log("audience_insight", f"📄 搜索完成，获得 {len(all_results)} 条相关结果")
    return {"search_results": all_results[:FETCH_TOP]}


async def fetch_node(state: State) -> dict:
    """并发读取页面内容。"""
    write_log("audience_insight", f"📄 开始并发抓取 {len(state.search_results)} 个页面…")
    async def fetch_one(url: str) -> FetchedPage:
        write_log("audience_insight", f"📄 正在请求 {url}…")
        try:
            async with AsyncClient(timeout=FETCH_TIMEOUT) as client:
                resp = await client.get(url, headers={"User-Agent": USER_AGENT}, follow_redirects=True)
                resp.raise_for_status()
                if "text/html" not in resp.headers.get("content-type", ""):
                    write_log("audience_insight", f"⚠️ {url} 非 HTML 内容，跳过")
                    return FetchedPage(url=url, title=None, content="", fetched=False)
                text = extract_text_from_html(resp.text)
                if len(text) > MAX_PAGE_CHARS:
                    text = text[:MAX_PAGE_CHARS] + "\n...[截断]"
                soup = BeautifulSoup(resp.text, "lxml")
                title = soup.title.string.strip() if soup.title and soup.title.string else None
                write_log("audience_insight", f"✓ 成功读取 {url}（{len(text)} 字符）")
                return FetchedPage(url=url, title=title, content=text)
        except TimeoutException as exc:
            logger.warning("audience_insight timeout: %s (%s)", url, exc)
            write_log("audience_insight", f"⏱️ {url} 请求超时，跳过")
            return FetchedPage(url=url, title=None, content="", fetched=False)
        except HTTPError as exc:
            logger.warning("audience_insight HTTP error: %s (%s)", url, exc)
            write_log("audience_insight", f"⚠️ {url} HTTP 错误，跳过")
            return FetchedPage(url=url, title=None, content="", fetched=False)
        except Exception as exc:
            logger.exception("audience_insight fetch failed: %s", url)
            write_log("audience_insight", f"⚠️ {url} 读取失败，跳过")
            return FetchedPage(url=url, title=None, content="", fetched=False)

    sem = asyncio.Semaphore(FETCH_CONCURRENCY)

    async def wrapped(url: str) -> FetchedPage:
        async with sem:
            return await fetch_one(url)

    results = await asyncio.gather(*[wrapped(r.url) for r in state.search_results])
    fetched_count = sum(1 for p in results if p.fetched)
    write_log("audience_insight", f"📄 抓取完成：成功 {fetched_count}/{len(results)} 个页面")
    return {"fetched_pages": list(results)}


async def extract_audience_node(state: State) -> dict:
    """从页面内容提取人群数据。"""
    valid = [p for p in state.fetched_pages if p.fetched and p.content]
    if not valid:
        write_log("audience_insight", "⚠️ 没有有效页面内容可供分析")
        return {"audience_data": AudienceRawData()}

    write_log("audience_insight", f"🤖 正在用 AI 分析 {len(valid)} 个页面的人群数据…")
    prompt = _load_template("audience_insight.md.j2", product_name=state.product_name, category=state.category, fetched_pages=valid)
    llm = build_chat_model().with_structured_output(AudienceRawData)

    result: AudienceRawData = await llm.ainvoke([
        SystemMessage(content=prompt),
        HumanMessage(content=f"请提取产品「{state.product_name}」的目标人群信息。"),
    ])

    write_log("audience_insight", "🤖 AI 提取完成，正在整理数据来源…")
    # 补 sources
    all_urls = [p.url for p in valid]
    result.sources = all_urls
    for item_list in [result.purchase_motivations, result.decision_factors, result.usage_scenarios, result.descriptions]:
        for item in item_list:
            if not item.source:
                item.source = all_urls[0] if all_urls else ""

    return {"audience_data": result}


async def generate_persona_node(state: State) -> dict:
    """生成用户画像。"""
    if not state.audience_data:
        write_log("audience_insight", "⚠️ 没有人群数据可生成画像")
        return {"persona": UserPersona()}

    write_log("audience_insight", "🤖 正在基于人群数据生成用户画像…")
    product_info_str = json.dumps(state.product_info, ensure_ascii=False)[:2000] if state.product_info else ""

    market_info_str = json.dumps(state.market_info, ensure_ascii=False)[:2000] if state.market_info else ""

    prompt = _load_template("persona_generation.md.j2",
                            product_name=state.product_name,
                            category=state.category,
                            product_info=product_info_str,
                            market_info=market_info_str,
                            audience_data=state.audience_data)

    llm = build_chat_model().with_structured_output(UserPersona)
    result: UserPersona = await llm.ainvoke([
        SystemMessage(content=prompt),
        HumanMessage(content=f"请为产品「{state.product_name}」生成用户画像。"),
    ])

    write_log("audience_insight", "✓ 用户画像生成完成")
    return {"persona": result}


# ── ReAct 节点 ──


async def init_react_node(state: State) -> dict:
    """初始化 ReAct 对话：将批量抓取的页面内容注入 system prompt。"""
    valid = [p for p in state.fetched_pages if p.fetched and p.content]
    prompt = _load_template("audience_insight_react.md.j2",
                             product_name=state.product_name,
                             category=state.category,
                             initial_pages=valid)
    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content=f"请调研产品「{state.product_name}」的目标人群信息。"),
    ]
    write_log("audience_insight", f"🚀 进入 ReAct 阶段（已有 {len(valid)} 个有效页面）")
    return {"messages": messages, "tool_call_count": 0}


async def agent_node(state: State) -> dict:
    """ReAct agent：绑定 web_search/web_fetch 工具，基于已有页面内容决定是否补充搜索。"""
    new_count = state.tool_call_count
    if state.messages and isinstance(state.messages[-1], ToolMessage):
        new_count = state.tool_call_count + 1
        write_log("audience_insight", f"🛠️ ReAct 工具调用累计 {new_count}/{MAX_TOOL_ROUNDS} 轮")

    llm = _build_model().bind_tools([web_search_tool, web_fetch_tool])
    response = await llm.ainvoke(list(state.messages))
    return {"messages": [response], "tool_call_count": new_count}


def _route_after_agent(state: State) -> str:
    """agent 之后：有工具调用且未超轮次 → tools；否则 → extract_audience。"""
    last = state.messages[-1] if state.messages else None
    if not (last and getattr(last, "tool_calls", None)):
        return "extract_audience"
    if state.tool_call_count >= MAX_TOOL_ROUNDS:
        return "extract_audience"
    return "tools"


# ── 图构建 ──


def _build_graph():
    g = StateGraph(State)
    g.add_node("search", search_node)
    g.add_node("fetch", fetch_node)
    g.add_node("init_react", init_react_node)
    g.add_node("agent", agent_node)
    g.add_node("tools", ToolNode([web_search_tool, web_fetch_tool]))
    g.add_node("extract_audience", extract_audience_node)
    g.add_node("generate_persona", generate_persona_node)

    g.set_entry_point("search")
    g.add_edge("search", "fetch")
    g.add_edge("fetch", "init_react")
    g.add_edge("init_react", "agent")
    g.add_conditional_edges(
        "agent", _route_after_agent, {"tools": "tools", "extract_audience": "extract_audience"}
    )
    g.add_edge("tools", "agent")
    g.add_edge("extract_audience", "generate_persona")
    g.add_edge("generate_persona", END)
    return g.compile()


_graph = _build_graph()


async def run_audience_insight(
    product_name: str,
    category: str = "",
    product_info: dict | None = None,
    market_info: dict | None = None,
) -> tuple[AudienceRawData, UserPersona]:
    """执行人群洞察，返回 (原始人群数据, 用户画像)。"""
    state = await _graph.ainvoke({
        "product_name": product_name,
        "category": category,
        "product_info": product_info or {},
        "market_info": market_info or {},
    })
    audience = state.get("audience_data")
    persona = state.get("persona")
    if audience is None or persona is None:
        raise ValueError("Agent did not return complete result")
    return audience, persona


# ── Registry entries (for workflow orchestration) ──


async def run_audience_search(state: dict[str, Any]) -> dict[str, Any]:
    """Workflow handler: 只搜索人群数据，不生成画像。"""
    pn = state.get("product_name")
    if not pn:
        raise ValueError("Missing required input: product_name")
    cat = state.get("category", "")
    s = await _graph.ainvoke({"product_name": pn, "category": cat})
    ad = s.get("audience_data")
    if ad is None:
        raise ValueError("Agent did not return audience data")
    # 持久化到 mock_data/audience_insight/
    AUDIENCE_DIR.mkdir(parents=True, exist_ok=True)
    path = AUDIENCE_DIR / f"{pn.replace(' ', '_').lower()}.json"
    path.write_text(ad.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8")
    return ad.model_dump()


async def run_generate_persona(state: dict[str, Any]) -> dict[str, Any]:
    """Workflow handler: 基于上游调研结果生成用户画像。

    接收已经在 input 中传好的 product_info、market_info、audience_data。
    """
    pn = state.get("product_name")
    if not pn:
        raise ValueError("Missing required input: product_name")

    audience_data_raw = state.get("audience_data", {})
    ad = AudienceRawData.model_validate(audience_data_raw)

    product_info_str = json.dumps(state.get("product_info", {}), ensure_ascii=False)[:2000] if state.get("product_info") else ""
    market_info_str = json.dumps(state.get("market_info", {}), ensure_ascii=False)[:2000] if state.get("market_info") else ""

    prompt = _load_template("persona_generation.md.j2",
                            product_name=pn,
                            category=state.get("category", ""),
                            product_info=product_info_str,
                            market_info=market_info_str,
                            audience_data=ad)

    llm = build_chat_model().with_structured_output(UserPersona)
    result: UserPersona = await llm.ainvoke([
        SystemMessage(content=prompt),
        HumanMessage(content=f"请为产品「{pn}」生成用户画像。"),
    ])

    # 持久化到 mock_data/user_persona/
    pp = persona_path(pn)
    pp.parent.mkdir(parents=True, exist_ok=True)
    pp.write_text(result.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8")

    return result.model_dump()


register("audience_search", run_audience_search)
register("generate_persona", run_generate_persona)


async def run_audience_insight_full(state: dict[str, Any]) -> dict[str, Any]:
    """Full pipeline handler: search → fetch → ReAct → extract → generate_persona.

    Used by plan_generation_service via get_handler('audience_insight').
    Returns both audience_data and persona so downstream nodes have
    the complete audience insight payload.
    """
    product_name = state.get("product_name") or state.get("brand_name")
    if not product_name:
        raise ValueError("Missing required input: product_name or brand_name")

    result = await _graph.ainvoke({
        "product_name": product_name,
        "category": state.get("category", ""),
        "product_info": state.get("product_info", {}),
        "market_info": state.get("market_info", {}),
    })
    audience = result.get("audience_data")
    persona = result.get("persona")

    if audience is None or persona is None:
        raise ValueError("Agent did not return complete result")

    write_log("audience_insight", "✓ 人群洞察完成")

    return {
        "audience_data": audience.model_dump() if hasattr(audience, "model_dump") else audience,
        "persona": persona.model_dump() if hasattr(persona, "model_dump") else persona,
    }


register("audience_insight", run_audience_insight_full)

