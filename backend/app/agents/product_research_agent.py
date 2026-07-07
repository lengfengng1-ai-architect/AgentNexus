"""产品信息调研 Agent

通过 Web 搜索和深度读页，提取产品的结构化基础信息。
输出按 identity / official_description / features / specifications / availability 五大模块组织。

OpenSpec: changes/product-research-v2
superpowers in_scope ID: product-research
"""

import asyncio
import logging
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup
from httpx import AsyncClient, HTTPError, TimeoutException
from jinja2 import Environment, FileSystemLoader

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from openai import BadRequestError
from pydantic import BaseModel, Field

from app.agents.llm_utils import build_chat_model, duckduckgo_search, write_log
from app.agents.registry import register
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
FETCH_TOP_N = 5
FETCH_TIMEOUT = 15
MAX_PAGE_CHARS = 8000
SKIP_EXTENSIONS = {'.pdf', '.doc', '.docx', '.zip', '.jpg', '.png', '.gif', '.ppt', '.pptx', '.xls', '.xlsx'}
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

# 记录最近一次抓取的 URL，供 retry 时排除
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
    output: ProductResearchResult | None = None
    exclude_urls: list[str] = Field(default_factory=list)


# ── 辅助函数 ────────────────────────────────────────────────

_model = None


def _build_model():
    global _model
    if _model is None:
        _model = build_chat_model()
    return _model


def _load_prompt(product_name: str, fetched_pages: list[FetchedPage]) -> str:
    env = Environment(loader=FileSystemLoader("app/prompt_templates"))
    template = env.get_template("product_research.md.j2")
    return template.render(product_name=product_name, fetched_pages=fetched_pages)


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
    """搜索产品信息。"""
    product = state.product_name
    all_results: list[SearchResult] = []
    keywords = [product, f"{product} 产品规格", product]
    seen_urls: set[str] = set(state.exclude_urls)

    for i, kw in enumerate(keywords):
        write_log("product_research", f"🔍 正在用关键词「{kw}」搜索…")
        try:
            raw = await duckduckgo_search(kw, max_results=SEARCH_MAX_RESULTS)
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
            write_log("product_research", f"📄 第 {i+1} 轮搜索完成，累计发现 {len(seen_urls)} 条结果")
        except Exception:
            write_log("product_research", f"⚠️ 关键词「{kw}」搜索失败，跳过")
            continue

    all_results.sort(key=lambda r: (_domain_priority(r.url), r.title), reverse=True)
    # Filter out binary file URLs and datasheet/download links
    filtered = [
        r for r in all_results
        if not any(r.url.split('?')[0].lower().endswith(ext) for ext in SKIP_EXTENSIONS)
        and not any(kw in (r.title + r.snippet).lower() for kw in ['datasheet', '规格书', '数据手册', 'download', 'pdf'])
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
        except TimeoutException:
            write_log("product_research", f"⏱️ {url} 请求超时，跳过")
            return FetchedPage(url=url, title=None, content="", fetched=False)
        except HTTPError:
            write_log("product_research", f"⚠️ {url} HTTP 错误，跳过")
            return FetchedPage(url=url, title=None, content="", fetched=False)
        except Exception:
            write_log("product_research", f"⚠️ {url} 读取失败，跳过")
            return FetchedPage(url=url, title=None, content="", fetched=False)

    tasks = [fetch_one(url) for url in urls]
    results = await asyncio.gather(*tasks)

    global _last_fetched_urls
    _last_fetched_urls = [r.url for r in results if r.fetched]

    fetched_count = sum(1 for p in results if p.fetched)
    write_log("product_research", f"📄 抓取完成：成功 {fetched_count}/{len(results)} 个页面")

    return {"fetched_pages": list(results)}


async def extract_node(state: ProductResearchState) -> dict:
    """LLM 提取结构化产品信息（五大模块）。"""
    valid_pages = [
        p for p in state.fetched_pages
        if p.fetched and p.content
    ]
    all_urls = [p.url for p in valid_pages]

    if not valid_pages:
        write_log("product_research", "⚠️ 没有有效页面内容可供分析")
        return {"output": ProductResearchResult()}

    write_log("product_research", f"🤖 正在用 AI 分析 {len(valid_pages)} 个页面的内容，提取结构化信息…")
    prompt = _load_prompt(state.product_name, valid_pages)
    llm = _build_model().with_structured_output(ProductResearchResult)

    result: ProductResearchResult = await llm.ainvoke([
        SystemMessage(content=prompt),
        HumanMessage(content=f"请提取产品「{state.product_name}」的结构化信息。"),
    ])

    write_log("product_research", "🤖 AI 提取完成，正在整理字段溯源…")
    _fill_sourced_fields(result, all_urls)
    write_log("product_research", f"✓ 提取到 {len(result.features)} 个功能、{len(result.identity.model_fields)} 个标识字段")

    return {"output": result}


async def enrich_website_node(state: ProductResearchState) -> dict:
    """补充官网 URL 到 identity。"""
    output = state.output
    if output is None:
        return {}

    product = state.product_name
    # 如果已有官网值且看起来不像通用首页，跳过
    existing = output.identity.product_name.value
    if existing and ("product" in existing.lower() or "shop" in existing.lower()):
        return {}

    try:
        raw = await duckduckgo_search(f"{product} 官方网站", max_results=5)
    except Exception:
        return {}

    for item in raw:
        url = item.get("href", "")
        if not url:
            continue
        if "官方" not in item.get("title", "") + item.get("body", "") and "官网" not in item.get("title", "") + item.get("body", ""):
            continue
        write_log("product_research", f"🌐 正在验证官网链接 {url}…")
        try:
            async with AsyncClient(timeout=FETCH_TIMEOUT) as client:
                resp = await client.get(url, headers={"User-Agent": USER_AGENT}, follow_redirects=True)
                resp.raise_for_status()
                text = extract_text_from_html(resp.text)
                if product.lower() in (text or "").lower()[:800]:
                    if url not in output.identity.product_name.sources:
                        output.identity.product_name.sources.append(url)
                        write_log("product_research", f"✓ 确认官网：{url}")
                    break
                else:
                    write_log("product_research", f"⚠️ {url} 内容不匹配，跳过")
        except Exception:
            write_log("product_research", f"⚠️ 访问 {url} 失败，跳过")
            continue

    return {"output": output}


# ── 图构建 ──────────────────────────────────────────────────


def _build_graph():
    graph = StateGraph(ProductResearchState)

    graph.add_node("search", search_node)
    graph.add_node("fetch", fetch_node)
    graph.add_node("extract", extract_node)
    graph.add_node("enrich_website", enrich_website_node)

    graph.set_entry_point("search")
    graph.add_edge("search", "fetch")
    graph.add_edge("fetch", "extract")
    graph.add_edge("extract", "enrich_website")
    graph.add_edge("enrich_website", END)

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
