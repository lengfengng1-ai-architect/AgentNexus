"""产品信息调研 Agent

通过 Web 搜索和深度读页，提取产品的结构化基础信息。
输出按 identity / official_description / features / specifications / availability 五大模块组织。

OpenSpec: changes/product-research-v2
superpowers in_scope ID: product-research
"""

import asyncio
from pathlib import Path

from bs4 import BeautifulSoup
from ddgs import DDGS
from httpx import AsyncClient, HTTPError, TimeoutException
from jinja2 import Environment, FileSystemLoader

from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from app.config.settings import settings
from app.agents.registry import register
from app.schemas.product_info import (
    ProductResearchResult,
    SourcedStr,
    SourcedDict,
    SourcedStrList,
)
from app.agents.registry import register

# ── mock_data 持久化 ──

MOCK_DATA_DIR = Path("mock_data") / "product_info"


def _sanitize(name: str) -> str:
    import re
    safe = re.sub(r'[^\w一-鿿]+', "_", name).strip("_").lower()
    return safe if safe else "unknown"


def _save_to_cache(product_name: str, info: ProductResearchResult) -> None:
    MOCK_DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = MOCK_DATA_DIR / f"{_sanitize(product_name)}.json"
    path.write_text(info.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8")

# ── 搜索和抓取常量 ──────────────────────────────────────────
SEARCH_MAX_RESULTS = 10
FETCH_TOP_N = 5
FETCH_TIMEOUT = 15
MAX_PAGE_CHARS = 8000
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


# ── 辅助函数 ────────────────────────────────────────────────


def _build_model():
    if settings.llm_provider == "agnes":
        return init_chat_model(
            model=settings.agnes_model,
            model_provider="openai",
            api_key=settings.agnes_api_key,
            base_url=settings.agnes_base_url,
        )
    elif settings.llm_provider == "myself":
        return init_chat_model(
            model=settings.myself_model,
            model_provider="openai",
            api_key=settings.myself_api_key,
            base_url=settings.myself_base_url,
        )
    return init_chat_model(
        model=settings.dashscope_model,
        model_provider="openai",
        api_key=settings.dashscope_api_key,
        base_url=settings.dashscope_base_url,
    )


def _load_prompt(product_name: str, fetched_pages: list[FetchedPage]) -> str:
    env = Environment(loader=FileSystemLoader("app/prompt_templates"))
    template = env.get_template("product_research.md.j2")
    return template.render(product_name=product_name, fetched_pages=fetched_pages)


def _domain_priority(url: str) -> int:
    from urllib.parse import urlparse
    hostname = urlparse(url).hostname or ""
    for domain in PRIORITY_DOMAINS:
        if hostname == domain or hostname.endswith("." + domain):
            return 2
    return 1


def _extract_text_from_html(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    return "\n".join(lines)


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
    seen_urls: set[str] = set()

    for kw in keywords:
        try:
            with DDGS() as ddgs:
                raw = list(ddgs.text(kw, max_results=SEARCH_MAX_RESULTS))
                for item in raw:
                    url = item.get("href", "")
                    if url and url not in seen_urls:
                        seen_urls.add(url)
                        all_results.append(SearchResult(
                            url=url,
                            title=item.get("title", ""),
                            snippet=item.get("body", ""),
                        ))
        except Exception:
            continue

    all_results.sort(key=lambda r: (_domain_priority(r.url), r.title), reverse=True)
    top = all_results[:FETCH_TOP_N]
    return {"search_results": top}


async def fetch_node(state: ProductResearchState) -> dict:
    """并发读取页面内容。"""
    urls = [r.url for r in state.search_results]

    async def fetch_one(url: str) -> FetchedPage:
        try:
            async with AsyncClient(timeout=FETCH_TIMEOUT) as client:
                resp = await client.get(url, headers={"User-Agent": USER_AGENT}, follow_redirects=True)
                resp.raise_for_status()
                content_type = resp.headers.get("content-type", "")
                if "text/html" not in content_type and "application/xhtml" not in content_type:
                    return FetchedPage(url=url, title=None, content="", fetched=False)
                raw = resp.text
                text = _extract_text_from_html(raw)
                if len(text) > MAX_PAGE_CHARS:
                    text = text[:MAX_PAGE_CHARS] + "\n...[内容截断]"
                soup = BeautifulSoup(raw, "lxml")
                title = soup.title.string.strip() if soup.title and soup.title.string else None
                return FetchedPage(url=url, title=title, content=text)
        except (TimeoutException, HTTPError, Exception):
            return FetchedPage(url=url, title=None, content="", fetched=False)

    tasks = [fetch_one(url) for url in urls]
    results = await asyncio.gather(*tasks)
    return {"fetched_pages": list(results)}


async def extract_node(state: ProductResearchState) -> dict:
    """LLM 提取结构化产品信息（五大模块）。"""
    valid_pages = [
        p for p in state.fetched_pages
        if p.fetched and p.content
    ]
    all_urls = [p.url for p in valid_pages]

    if not valid_pages:
        return {"output": ProductResearchResult()}

    prompt = _load_prompt(state.product_name, valid_pages)
    llm = _build_model().with_structured_output(ProductResearchResult)

    result: ProductResearchResult = await llm.ainvoke([
        SystemMessage(content=prompt),
        HumanMessage(content=f"请提取产品「{state.product_name}」的结构化信息。"),
    ])

    _fill_sourced_fields(result, all_urls)

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
        with DDGS() as ddgs:
            results = list(ddgs.text(f"{product} 官方网站", max_results=5))
    except Exception:
        return {}

    for item in results:
        url = item.get("href", "")
        if not url:
            continue
        if "官方" not in item.get("title", "") + item.get("body", "") and "官网" not in item.get("title", "") + item.get("body", ""):
            continue
        try:
            async with AsyncClient(timeout=FETCH_TIMEOUT) as client:
                resp = await client.get(url, headers={"User-Agent": USER_AGENT}, follow_redirects=True)
                resp.raise_for_status()
                text = _extract_text_from_html(resp.text)
                if product.lower() in (text or "").lower()[:800]:
                    # 将官网 URL 存到 identity.product_name 的 sources
                    if url not in output.identity.product_name.sources:
                        output.identity.product_name.sources.append(url)
                    break
        except Exception:
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


async def research_product(product_name: str) -> ProductResearchResult:
    """执行产品信息调研。"""
    result = await _graph.ainvoke({"product_name": product_name})
    output = result.get("output")
    if output is None:
        raise ValueError("Agent did not return structured output")
    return output


async def run_product_research(state: dict[str, Any]) -> dict[str, Any]:
    """Workflow-compatible handler: input dict → output dict.

    Expects state keys: product_name or brand_name.
    Uses brand_name as the product to research.
    """
    brand_name = state.get("brand_name") or state.get("product_name")
    if not brand_name:
        raise ValueError("Missing required input: brand_name or product_name")
    if settings.use_mock_data:
        return {"product_name": brand_name, "summary": f"Mock research for {brand_name}"}
    result = await research_product(brand_name)
    _save_to_cache(brand_name, result)
    return result.model_dump()


register("product_research", run_product_research)
