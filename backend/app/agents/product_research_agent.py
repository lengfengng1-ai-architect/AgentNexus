"""产品信息调研 Agent

Hybrid 架构（批量并行搜索抓取 + ReAct 工具调用）：
Step 1: batch_search_fetch 节点 —— 3 关键词并行搜索 + 并发抓取 top 25 页面，注入 prompt。
Step 2: ReAct 循环 —— LLM 绑定 web_search/web_fetch 工具，自主决定是否查漏补缺（最多 3 轮）。
Step 3: finalize 节点 —— with_structured_output(ProductResearchResult) 做最终结构化输出。

输出按 identity / official_description / features / specifications / availability 五大模块组织。

OpenSpec: changes/product-research-tool-calling
superpowers in_scope ID: product-research
"""

import asyncio
import logging
from functools import cache
from pathlib import Path
from typing import Annotated, Any

from bs4 import BeautifulSoup
from httpx import AsyncClient, HTTPError, TimeoutException
from jinja2 import Environment, FileSystemLoader

from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import END, StateGraph, add_messages
from langgraph.prebuilt import ToolNode
from openai import BadRequestError
from pydantic import BaseModel, Field

from app.agents.llm_utils import build_chat_model, searxng_search, write_log
from app.agents.registry import register
from app.agents.tools import web_fetch_tool, web_search_tool
from app.schemas.product_info import (
    ProductResearchResult,
)
from app.utils import sanitize, extract_text_from_html
from urllib.parse import urlparse

# ── mock_data 持久化 ──

logger = logging.getLogger(__name__)
MOCK_DATA_DIR = Path("mock_data") / "product_info"


def _save_to_cache(product_name: str, info: ProductResearchResult) -> None:
    MOCK_DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = MOCK_DATA_DIR / f"{sanitize(product_name)}.json"
    path.write_text(info.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8")

# ── 搜索和抓取常量 ──────────────────────────────────────────
SEARCH_MAX_RESULTS = 10
FETCH_TOP_N = 25
FETCH_TIMEOUT = 10
MAX_PAGE_CHARS = 4000
SKIP_EXTENSIONS = {'.pdf', '.doc', '.docx', '.zip', '.jpg', '.png', '.gif', '.ppt', '.pptx', '.xls', '.xlsx'}
FETCH_CONCURRENCY = 8
# ReAct 循环最大工具调用轮次
MAX_TOOL_ROUNDS = 3
# 已知 403 屏蔽爬虫的域名，在搜索去重阶段跳过
BLOCKED_DOMAINS = {"zhuanlan.zhihu.com", "baike.baidu.com", "wenku.baidu.com"}
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

PRIORITY_DOMAINS = {
    "apple.com", "xiaomi.com", "huawei.com", "vivo.com", "oppo.com",
    "mi.com", "honor.com", "samsung.com", "oneplus.com",
    "baike.baidu.com", "zh.wikipedia.org", "en.wikipedia.org",
    "zdnet.com", "theverge.com", "gsmarena.com", "cnmo.com",
    "zol.com.cn", "smzdm.com", "ithome.com", "pcpop.com",
}

# 记录最近一次抓取的 URL，供 content-filter 重试排除时使用
_last_fetched_urls: list[str] = []


class SearchResult(BaseModel):
    url: str
    title: str
    snippet: str


class FetchedPage(BaseModel):
    url: str
    title: str | None
    content: str
    fetched: bool = True


class ProductResearchState(BaseModel):
    product_name: str
    search_results: list[SearchResult] = Field(default_factory=list)
    fetched_pages: list[FetchedPage] = Field(default_factory=list)
    # Step 1 输出
    initial_pages: list[FetchedPage] = Field(default_factory=list)
    seen_urls: list[str] = Field(default_factory=list)
    # Step 2 ReAct 对话与计数
    messages: Annotated[list, add_messages] = Field(default_factory=list)
    tool_call_count: int = 0
    output: ProductResearchResult | None = None
    exclude_urls: list[str] = Field(default_factory=list)


# ── 辅助函数 ────────────────────────────────────────────────

@cache
def _build_model():
    return build_chat_model()


def _load_prompt(product_name: str, initial_pages: list[FetchedPage]) -> str:
    env = Environment(loader=FileSystemLoader("app/prompt_templates"))
    template = env.get_template("product_research.md.j2")
    return template.render(product_name=product_name, initial_pages=initial_pages)


def _domain_priority(url: str) -> int:
    hostname = urlparse(url).hostname or ""
    for domain in PRIORITY_DOMAINS:
        if hostname == domain or hostname.endswith("." + domain):
            return 2
    return 1


def _fill_sourced_fields(result: ProductResearchResult, all_urls: list[str]) -> None:
    """填充所有 SourcedStr/SourcedStrList/SourcedDict 的 sources。"""
    for field in result.identity.model_fields:
        getattr(result.identity, field).sources = all_urls
    for field in result.official_description.model_fields:
        getattr(result.official_description, field).sources = all_urls
    for field in result.availability.model_fields:
        if field == "pricing":
            continue
        getattr(result.availability, field).sources = all_urls
    result.specifications.sources = all_urls


# ── LangGraph 节点 ──────────────────────────────────────────


async def search_node(state: ProductResearchState) -> dict:
    """搜索产品信息（关键词并行）。"""
    product = state.product_name
    all_results: list[SearchResult] = []
    keywords = [product, f"{product} 产品规格", product]
    seen_urls: set[str] = set(state.exclude_urls)

    write_log("product_research", f"🔍 正在用 {len(keywords)} 个关键词并行搜索…")

    async def search_one(kw: str, idx: int) -> tuple[int, list[dict[str, str]]]:
        try:
            raw = await searxng_search(kw, max_results=SEARCH_MAX_RESULTS)
            return idx, raw or []
        except Exception:
            write_log("product_research", f"⚠️ 关键词「{kw}」搜索失败，跳过")
            return idx, []

    batches = await asyncio.gather(*[search_one(kw, i) for i, kw in enumerate(keywords)])

    for _i, raw in sorted(batches, key=lambda x: x[0]):
        kw = keywords[_i]
        if not raw:
            write_log("product_research", f"⚠️ 关键词「{kw}」搜索无结果，跳过")
            continue
        for item in raw:
            url = item.get("href", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                all_results.append(SearchResult(
                    url=url,
                    title=item.get("title", ""),
                    snippet=item.get("body", ""),
                ))

    write_log("product_research", f"📄 搜索完成，累计发现 {len(seen_urls)} 条结果")

    all_results.sort(key=lambda r: (_domain_priority(r.url), r.title), reverse=True)
    # Filter out binary file URLs, datasheet/download links, and blocked domains
    filtered = [
        r for r in all_results
        if not any(r.url.split('?')[0].lower().endswith(ext) for ext in SKIP_EXTENSIONS)
        and not any(kw in (r.title + r.snippet).lower() for kw in ['datasheet', '规格书', '数据手册', 'download', 'pdf'])
        and urlparse(r.url).hostname not in BLOCKED_DOMAINS
    ]
    top = filtered[:FETCH_TOP_N]
    write_log("product_research", f"📄 过滤非网页链接后取前 {len(top)} 条")
    return {"search_results": top}


async def fetch_node(state: ProductResearchState) -> dict:
    """并发读取页面内容。"""
    urls = [r.url for r in state.search_results]
    write_log("product_research", f"📄 开始并发抓取 {len(urls)} 个页面…")

    async def fetch_one(url: str) -> FetchedPage:
        # Skip known binary/PDF URLs before making HTTP request
        path_part = url.split('?')[0].lower()
        if any(path_part.endswith(ext) for ext in SKIP_EXTENSIONS):
            return FetchedPage(url=url, title=None, content="", fetched=False)
        write_log("product_research", f"📄 正在请求 {url}…")
        try:
            async with AsyncClient(timeout=FETCH_TIMEOUT) as client:
                resp = await client.get(url, headers={"User-Agent": USER_AGENT}, follow_redirects=True)
                resp.raise_for_status()
                content_type = resp.headers.get("content-type", "")
                if "text/html" not in content_type and "application/xhtml" not in content_type:
                    write_log("product_research", f"⚠️ {url} 非 HTML 内容，跳过")
                    return FetchedPage(url=url, title=None, content="", fetched=False)
                raw = resp.text
                text = extract_text_from_html(raw)
                if len(text) > MAX_PAGE_CHARS:
                    text = text[:MAX_PAGE_CHARS] + "\n...[内容截断]"
                soup = BeautifulSoup(raw, "lxml")
                title = soup.title.string.strip() if soup.title and soup.title.string else None
                write_log("product_research", f"✓ 成功读取 {url}（{len(text)} 字符）")
                return FetchedPage(url=url, title=title, content=text)
        except TimeoutException as exc:
            logger.warning("product_research timeout: %s (%s)", url, exc)
            write_log("product_research", f"⏱️ {url} 请求超时，跳过")
            return FetchedPage(url=url, title=None, content="", fetched=False)
        except HTTPError as exc:
            logger.warning("product_research HTTP error: %s (%s)", url, exc)
            write_log("product_research", f"⚠️ {url} HTTP 错误，跳过")
            return FetchedPage(url=url, title=None, content="", fetched=False)
        except Exception:
            logger.exception("product_research fetch failed: %s", url)
            write_log("product_research", f"⚠️ {url} 读取失败，跳过")
            return FetchedPage(url=url, title=None, content="", fetched=False)

    tasks = [fetch_one(url) for url in urls]
    sem = asyncio.Semaphore(FETCH_CONCURRENCY)

    async def wrapped(url: str) -> FetchedPage:
        async with sem:
            return await fetch_one(url)

    results = await asyncio.gather(*[wrapped(url) for url in urls])

    _last_fetched_urls[:] = [r.url for r in results if r.fetched]

    fetched_count = sum(1 for p in results if p.fetched)
    write_log("product_research", f"📄 抓取完成：成功 {fetched_count}/{len(results)} 个页面")

    return {"fetched_pages": list(results)}


# ── Step 1: 批量搜索 + 抓取 ─────────────────────────────────


async def batch_search_fetch_node(state: ProductResearchState) -> dict:
    """Step 1：复用 search_node + fetch_node 做批量并行搜索抓取，并初始化 ReAct 对话。"""
    write_log("product_research", "🚀 Step 1：批量并行搜索 + 抓取")

    search_out = await search_node(state)
    intermediate = state.model_copy(update={"search_results": search_out["search_results"]})
    fetch_out = await fetch_node(intermediate)

    pages: list[FetchedPage] = fetch_out["fetched_pages"]
    valid = [p for p in pages if p.fetched and p.content]
    seen = [p.url for p in pages]
    write_log("product_research", f"📄 批量抓取完成：有效页面 {len(valid)} 个，进入 ReAct 阶段")

    # 初始化 ReAct 对话：系统 prompt 注入 initial_pages 内容 + 工具说明 + 任务指令
    sys_prompt = _load_prompt(state.product_name, valid)
    messages = [
        SystemMessage(content=sys_prompt),
        HumanMessage(
            content=(
                f"请调研产品「{state.product_name}」的结构化信息。"
                "信息充足时直接给出调研结论（不要调用工具）；"
                "缺少关键信息时可调用 web_search / web_fetch 补充。"
            )
        ),
    ]
    return {
        "search_results": search_out["search_results"],
        "fetched_pages": pages,
        "initial_pages": valid,
        "seen_urls": seen + list(state.exclude_urls),
        "messages": messages,
        "tool_call_count": 0,
    }


# ── Step 2: ReAct 循环 ──────────────────────────────────────


async def agent_node(state: ProductResearchState) -> dict:
    """ReAct agent：绑定 web_search/web_fetch 工具，基于已有页面内容决定是否补充搜索。"""
    # 刚从 tools 返回（上一条是 ToolMessage）→ 一轮工具调用完成
    new_count = state.tool_call_count
    if state.messages and isinstance(state.messages[-1], ToolMessage):
        new_count = state.tool_call_count + 1
        write_log("product_research", f"🛠️ ReAct 工具调用累计 {new_count}/{MAX_TOOL_ROUNDS} 轮")

    llm = _build_model().bind_tools([web_search_tool, web_fetch_tool])
    response = await llm.ainvoke(list(state.messages))
    return {"messages": [response], "tool_call_count": new_count}


def _route_after_agent(state: ProductResearchState) -> str:
    """agent 之后：有工具调用且未超轮次 → tools；否则 → finalize。"""
    last = state.messages[-1] if state.messages else None
    if not (last and getattr(last, "tool_calls", None)):
        return "finalize"
    if state.tool_call_count >= MAX_TOOL_ROUNDS:
        return "finalize"
    return "tools"


def _collect_tool_fetch_urls(messages: list) -> list[str]:
    """从 ReAct 对话中收集 web_fetch 工具调用抓取过的 URL，用于溯源。"""
    urls: list[str] = []
    for m in messages:
        calls = getattr(m, "tool_calls", None) or []
        for c in calls:
            if c.get("name") == "web_fetch":
                url = c.get("args", {}).get("url")
                if url:
                    urls.append(url)
    return urls


# ── Step 3: 最终结构化输出 ──────────────────────────────────


async def finalize_node(state: ProductResearchState) -> dict:
    """用 with_structured_output 做最终结构化输出，复用溯源逻辑。

    ponytail: 流式 with_structured_output 偶发空首 chunk 导致 ValueError，
    捕获后降级为非流式调用重试一次。
    """
    write_log("product_research", "🤖 Step 2：生成结构化输出")

    has_batch = any(p.fetched and p.content for p in state.initial_pages)
    if not has_batch and state.tool_call_count == 0:
        write_log("product_research", "⚠️ 没有有效页面内容可供分析")
        return {"output": ProductResearchResult()}

    for attempt in (1, 2):
        try:
            llm = _build_model()
            if attempt == 1:
                structured = llm.with_structured_output(ProductResearchResult)
                msgs = list(state.messages)
            else:
                # 尝试2：不依赖 json_mode，用普通 invoke + 显式 JSON 指令
                from langchain_core.messages import SystemMessage, HumanMessage

                # 把原 messages 内容拼成一段提示，要求输出 JSON
                prompt_parts = []
                for m in state.messages:
                    if hasattr(m, "content") and m.content:
                        prompt_parts.append(str(m.content))
                prompt_text = "\n".join(prompt_parts)

                prompt_text += (
                    '\n\n请根据以上信息，输出严格的 JSON 格式（不要 markdown 代码块），'
                    '格式如下：\n'
                    '{"identity":{"name":"...","brand":"...","category":"..."},'
                    '"official_description":"...",'
                    '"features":[{"title":"...","description":"..."}],'
                    '"specifications":{"key":"value"},'
                    '"availability":[{"channel":"...","price":"..."}]}'
                )
                result_raw = await llm.ainvoke([
                    SystemMessage(content="你是一个产品信息提取专家。请只输出 JSON，不要包含其他文字。"),
                    HumanMessage(content=prompt_text),
                ])
                raw_text = (result_raw.content or "").strip()
                if raw_text.startswith("```"):
                    raw_text = raw_text.split("\n", 1)[1]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3]
                    raw_text = raw_text.strip()
                import json as _json
                parsed = _json.loads(raw_text)
                result = ProductResearchResult.model_validate(parsed)
        except (ValueError, Exception):
            if attempt == 1:
                logger.warning("product_research finalize_node: streaming parse failed, retrying raw text")
                write_log("product_research", "⚠️ 结构化输出解析失败，正在重试…")
                continue
            # 第二次也失败，返回空结果避免整个 pipeline 卡死
            logger.exception("product_research finalize_node: both attempts failed")
            write_log("product_research", "⚠️ 结构化输出解析两次均失败，返回空结果")
            return {"output": ProductResearchResult()}

    # 溯源：批量页面 + ReAct 中 web_fetch 抓取的新 URL
    all_urls = [p.url for p in state.initial_pages if p.fetched and p.content]
    all_urls += _collect_tool_fetch_urls(state.messages)
    _fill_sourced_fields(result, all_urls)
    write_log(
        "product_research",
        f"✓ 提取到 {len(result.features)} 个功能、{len(result.identity.model_fields)} 个标识字段",
    )
    return {"output": result}


# ── 图构建 ──────────────────────────────────────────────────


def _build_graph():
    graph = StateGraph(ProductResearchState)

    graph.add_node("batch_search_fetch", batch_search_fetch_node)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", ToolNode([web_search_tool, web_fetch_tool]))
    graph.add_node("finalize", finalize_node)

    graph.set_entry_point("batch_search_fetch")
    graph.add_edge("batch_search_fetch", "agent")
    graph.add_conditional_edges(
        "agent", _route_after_agent, {"tools": "tools", "finalize": "finalize"}
    )
    graph.add_edge("tools", "agent")
    graph.add_edge("finalize", END)

    return graph.compile()


_graph = _build_graph()


async def research_product(product_name: str, exclude_urls: list[str] | None = None) -> ProductResearchResult:
    """执行产品信息调研（使用内部 LangGraph，保持原有 API 签名）。"""
    result = await _graph.ainvoke({"product_name": product_name, "exclude_urls": exclude_urls or []})
    output = result.get("output")
    if output is None:
        raise ValueError("Agent did not return structured output")
    return output


async def run_product_research(state: dict[str, Any]) -> dict[str, Any]:
    """Workflow-compatible handler: sequential steps with live operation logs.

    Expects state keys: product_name or brand_name.
    Uses brand_name as the product to research.

    异常重试：OpenAI 内容审核拒绝时自动重试，跳过首次抓取的来源 URL。
    """
    brand_name = state.get("brand_name") or state.get("product_name")
    if not brand_name:
        raise ValueError("Missing required input: brand_name or product_name")

    for attempt in (1, 2):
        try:
            exclude = state.get("_exclude_urls", []) if attempt == 2 else []
            result = await research_product(brand_name, exclude_urls=exclude)
            _save_to_cache(brand_name, result)
            write_log("product_research", "✓ 产品调研完成")
            return result.model_dump()
        except BadRequestError as e:
            if attempt == 1 and "data_inspection_failed" in str(e):
                logger.warning("product_research blocked (attempt 1/2), retrying with different sources…")
                # Collect URLs used in this failed attempt and pass to next try
                state["_exclude_urls"] = [p.url for p in _last_fetched_urls] if _last_fetched_urls else []
            else:
                raise

    return {}  # Should not reach here


register("product_research", run_product_research)
