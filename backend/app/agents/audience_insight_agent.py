"""人群洞察 Agent

搜索目标产品的目标人群信息并生成用户画像。

superpowers in_scope ID: audience-insight
"""

import asyncio
import json
from typing import Any

from bs4 import BeautifulSoup
from ddgs import DDGS
from httpx import AsyncClient, HTTPError, TimeoutException
from jinja2 import Environment, FileSystemLoader
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from app.agents.llm_utils import build_chat_model
from app.agents.registry import register
from app.config.cache_paths import AUDIENCE_DIR, persona_path
from app.schemas.audience_insight import AudienceRawData, UserPersona
from app.utils import extract_text_from_html

# ── 常量 ──
SEARCH_MAX = 8
FETCH_TOP = 5
FETCH_TIMEOUT = 15
MAX_PAGE_CHARS = 8000
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
    product_info: dict = Field(default_factory=dict)
    market_info: dict = Field(default_factory=dict)
    search_results: list[SearchResult] = Field(default_factory=list)
    fetched_pages: list[FetchedPage] = Field(default_factory=list)
    audience_data: AudienceRawData | None = None
    persona: UserPersona | None = None


# ── 辅助 ──



def _load_template(name: str, **kwargs) -> str:
    _dir = os.path.join(os.path.dirname(__file__), "..", "prompt_templates")
    env = Environment(loader=FileSystemLoader(_dir))
    return env.get_template(name).render(**kwargs)


# ── 节点 ──


async def search_node(state: State) -> dict:
    """搜索目标人群信息。"""
    product = state.product_name
    all_results: list[SearchResult] = []
    keywords = [
        f"{product} 用户画像",
        f"{product} 目标人群",
        f"{product} 消费者分析",
        f"{product} 购买人群",
    ]
    seen: set[str] = set()

    for kw in keywords:
        try:
            with DDGS() as ddgs:
                for item in ddgs.text(kw, max_results=SEARCH_MAX):
                    url = item.get("href", "")
                    if url and url not in seen:
                        seen.add(url)
                        all_results.append(SearchResult(url=url, title=item.get("title", ""), snippet=item.get("body", "")))
        except Exception:
            continue

    return {"search_results": all_results[:FETCH_TOP]}


async def fetch_node(state: State) -> dict:
    """并发读取页面内容。"""
    async def fetch_one(url: str) -> FetchedPage:
        try:
            async with AsyncClient(timeout=FETCH_TIMEOUT) as client:
                resp = await client.get(url, headers={"User-Agent": USER_AGENT}, follow_redirects=True)
                resp.raise_for_status()
                if "text/html" not in resp.headers.get("content-type", ""):
                    return FetchedPage(url=url, title=None, content="", fetched=False)
                text = extract_text_from_html(resp.text)
                if len(text) > MAX_PAGE_CHARS:
                    text = text[:MAX_PAGE_CHARS] + "\n...[截断]"
                soup = BeautifulSoup(resp.text, "lxml")
                title = soup.title.string.strip() if soup.title and soup.title.string else None
                return FetchedPage(url=url, title=title, content=text)
        except (TimeoutException, HTTPError, Exception):
            return FetchedPage(url=url, title=None, content="", fetched=False)

    tasks = [fetch_one(r.url) for r in state.search_results]
    results = await asyncio.gather(*tasks)
    return {"fetched_pages": list(results)}


async def extract_audience_node(state: State) -> dict:
    """从页面内容提取人群数据。"""
    valid = [p for p in state.fetched_pages if p.fetched and p.content]
    if not valid:
        return {"audience_data": AudienceRawData()}

    prompt = _load_template("audience_insight.md.j2", product_name=state.product_name, fetched_pages=valid)
    llm = build_chat_model().with_structured_output(AudienceRawData)

    result: AudienceRawData = await llm.ainvoke([
        SystemMessage(content=prompt),
        HumanMessage(content=f"请提取产品「{state.product_name}」的目标人群信息。"),
    ])

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
        return {"persona": UserPersona()}

    product_info_str = json.dumps(state.product_info, ensure_ascii=False)[:2000] if state.product_info else ""

    market_info_str = json.dumps(state.market_info, ensure_ascii=False)[:2000] if state.market_info else ""

    prompt = _load_template("persona_generation.md.j2",
                            product_name=state.product_name,
                            product_info=product_info_str,
                            market_info=market_info_str,
                            audience_data=state.audience_data)

    llm = build_chat_model().with_structured_output(UserPersona)
    result: UserPersona = await llm.ainvoke([
        SystemMessage(content=prompt),
        HumanMessage(content=f"请为产品「{state.product_name}」生成用户画像。"),
    ])

    return {"persona": result}


# ── 图构建 ──


def _build_graph():
    g = StateGraph(State)
    g.add_node("search", search_node)
    g.add_node("fetch", fetch_node)
    g.add_node("extract_audience", extract_audience_node)
    g.add_node("generate_persona", generate_persona_node)

    g.set_entry_point("search")
    g.add_edge("search", "fetch")
    g.add_edge("fetch", "extract_audience")
    g.add_edge("extract_audience", "generate_persona")
    g.add_edge("generate_persona", END)
    return g.compile()


def _build_full_graph():
    """完整的 4 步图：search→fetch→extract→generate_persona。"""
    g = StateGraph(State)
    g.add_node("search", search_node)
    g.add_node("fetch", fetch_node)
    g.add_node("extract_audience", extract_audience_node)
    g.add_node("generate_persona", generate_persona_node)
    g.set_entry_point("search")
    g.add_edge("search", "fetch")
    g.add_edge("fetch", "extract_audience")
    g.add_edge("extract_audience", "generate_persona")
    g.add_edge("generate_persona", END)
    return g.compile()


def _build_search_only_graph():
    """只跑搜索→读取→提取，不生成画像（用于并行 pipeline 中的 audience_search 节点）。"""
    g = StateGraph(State)
    g.add_node("search", search_node)
    g.add_node("fetch", fetch_node)
    g.add_node("extract_audience", extract_audience_node)
    g.set_entry_point("search")
    g.add_edge("search", "fetch")
    g.add_edge("fetch", "extract_audience")
    g.add_edge("extract_audience", END)
    return g.compile()

_graph = _build_full_graph()
_graph_search = _build_search_only_graph()


async def run_audience_insight(
    product_name: str,
    product_info: dict | None = None,
    market_info: dict | None = None,
) -> tuple[AudienceRawData, UserPersona]:
    """执行人群洞察，返回 (原始人群数据, 用户画像)。

    注意: 这个函数跑内部完整图（search→fetch→extract→persona），
    而 registry handler 的 run_audience_search 只跑前半段，
    run_generate_persona 只跑后半段。
    """
    state = await _graph.ainvoke({
        "product_name": product_name,
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
    s = await _graph_search.ainvoke({"product_name": pn})
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
    """Full pipeline handler: search → fetch → extract → generate_persona.

    Used by plan_generation_service via get_handler('audience_insight').
    Returns both audience_data and persona so downstream nodes have
    the complete audience insight payload.
    """
    product_name = state.get("product_name") or state.get("brand_name")
    if not product_name:
        raise ValueError("Missing required input: product_name or brand_name")

    s = await _graph.ainvoke({
        "product_name": product_name,
        "product_info": state.get("product_info", {}),
        "market_info": state.get("market_info", {}),
    })

    audience = s.get("audience_data")
    persona = s.get("persona")
    if audience is None or persona is None:
        raise ValueError("Agent did not return complete result")

    return {
        "audience_data": audience.model_dump() if hasattr(audience, "model_dump") else audience,
        "persona": persona.model_dump() if hasattr(persona, "model_dump") else persona,
    }


register("audience_insight", run_audience_insight_full)

