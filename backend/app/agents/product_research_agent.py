"""产品信息调研 Agent

通过 Web 搜索和深度读页，提取产品的结构化基础信息。

OpenSpec: (本次新增，暂无对应的 OpenSpec YAML 文件)
superpowers in_scope ID: product-research
"""

import asyncio

from bs4 import BeautifulSoup
from duckduckgo_search import DDGS
from httpx import AsyncClient, HTTPError, TimeoutException
from jinja2 import Environment, FileSystemLoader
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from app.config.settings import settings
from app.schemas.product_info import BasicInfo, ProductInfo

# ── 搜索和抓取常量 ──────────────────────────────────────────
SEARCH_MAX_RESULTS = 10
FETCH_TOP_N = 5
FETCH_TIMEOUT = 15  # 每个页面超时秒数
MAX_PAGE_CHARS = 8000  # 单页最多保留字符数
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

# 高优先级域名——优先选取
PRIORITY_DOMAINS = {
    "apple.com", "xiaomi.com", "huawei.com", "vivo.com", "oppo.com",
    "mi.com", "honor.com", "samsung.com", "oneplus.com",
    "baike.baidu.com", "zh.wikipedia.org", "en.wikipedia.org",
    "zdnet.com", "theverge.com", "gsmarena.com", "cnmo.com",
    "zol.com.cn", "smzdm.com", "ithome.com", "pcpop.com",
}


class SearchResult(BaseModel):
    """搜索结果条目。"""
    url: str
    title: str
    snippet: str


class FetchedPage(BaseModel):
    """已获取内容的网页。"""
    url: str
    title: str | None
    content: str
    fetched: bool = True


class ProductResearchState(BaseModel):
    """LangGraph 状态。"""
    product_name: str
    search_results: list[SearchResult] = Field(default_factory=list)
    fetched_pages: list[FetchedPage] = Field(default_factory=list)
    output: ProductInfo | None = None


# ── 辅助函数 ────────────────────────────────────────────────


def _build_model():
    """初始化 LLM。"""
    if settings.llm_provider == "agnes":
        return init_chat_model(
            model=settings.agnes_model,
            model_provider="openai",
            api_key=settings.agnes_api_key,
            base_url=settings.agnes_base_url,
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
    """返回域名优先级分数，越高越优先。"""
    from urllib.parse import urlparse
    hostname = urlparse(url).hostname or ""
    for domain in PRIORITY_DOMAINS:
        if hostname == domain or hostname.endswith("." + domain):
            return 2
    return 1


def _extract_text_from_html(html: str) -> str:
    """从 HTML 提取纯文本。"""
    soup = BeautifulSoup(html, "lxml")
    # 移除脚本和样式
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    # 合并多余空行
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    return "\n".join(lines)


# ── LangGraph 节点 ──────────────────────────────────────────


async def search_node(state: ProductResearchState) -> dict:
    """搜索产品信息，返回高质量结果列表。"""
    product = state.product_name
    all_results: list[SearchResult] = []

    # 用中英文分别搜索
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
            continue  # 某个关键词失败不影响其他

    # 按域名优先级排序 + 去重，取 TOP N
    all_results.sort(key=lambda r: (_domain_priority(r.url), r.title), reverse=True)
    top = all_results[:FETCH_TOP_N]

    return {"search_results": top}


async def fetch_node(state: ProductResearchState) -> dict:
    """并发读取搜索结果中的页面内容。"""
    urls = [r.url for r in state.search_results]

    async def fetch_one(url: str) -> FetchedPage:
        try:
            async with AsyncClient(timeout=FETCH_TIMEOUT) as client:
                resp = await client.get(url, headers={"User-Agent": USER_AGENT}, follow_redirects=True)
                resp.raise_for_status()
                content_type = resp.headers.get("content-type", "")
                if "text/html" not in content_type and "application/xhtml" not in content_type:
                    return FetchedPage(url=url, title=None, content="[非 HTML 页面，跳过]", fetched=False)

                raw = resp.text
                text = _extract_text_from_html(raw)
                if len(text) > MAX_PAGE_CHARS:
                    text = text[:MAX_PAGE_CHARS] + "\n...[内容截断]"

                # 从标题提取
                soup = BeautifulSoup(raw, "lxml")
                title = soup.title.string.strip() if soup.title and soup.title.string else None
                return FetchedPage(url=url, title=title, content=text)
        except (TimeoutException, HTTPError, Exception):
            return FetchedPage(url=url, title=None, content="[页面读取失败]", fetched=False)

    tasks = [fetch_one(url) for url in urls]
    results = await asyncio.gather(*tasks)

    return {"fetched_pages": list(results)}


async def extract_node(state: ProductResearchState) -> dict:
    """LLM 提取结构化产品信息。"""
    # 过滤掉读取失败的页面
    valid_pages = [p for p in state.fetched_pages if p.fetched and p.content and "页面读取失败" not in p.content and "非 HTML 页面" not in p.content]

    if not valid_pages:
        return {"output": ProductInfo(
            basic=BasicInfo(product_name=state.product_name),
            sources=[],
        )}

    prompt = _load_prompt(state.product_name, valid_pages)
    llm = _build_model().with_structured_output(ProductInfo)

    result: ProductInfo = await llm.ainvoke([
        SystemMessage(content=prompt),
        HumanMessage(content=f"请提取产品「{state.product_name}」的基础信息。"),
    ])

    # 将所有有效页面的 URL 填入每个字段的 sources
    all_urls = [p.url for p in valid_pages]
    for field_name in result.basic.model_fields:
        field = getattr(result.basic, field_name)
        field.sources = all_urls

    return {"output": result}


async def enrich_website_node(state: ProductResearchState) -> dict:
    """搜索并补充官方网站（不管已有值都尝试找更精确的产品页）。"""
    output = state.output
    if output is None:
        return {}

    product = state.product_name
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(f"{product} 官方网站", max_results=5))
    except Exception:
        return {}

    best_url = None
    for item in results:
        url = item.get("href", "")
        title = item.get("title", "")
        snippet = item.get("body", "")
        if not url:
            continue
        # 优先找标题包含产品名的官网页面
        if "官方" not in title + snippet and "官网" not in title + snippet:
            continue
        try:
            async with AsyncClient(timeout=FETCH_TIMEOUT) as client:
                resp = await client.get(url, headers={"User-Agent": USER_AGENT}, follow_redirects=True)
                resp.raise_for_status()
                text = _extract_text_from_html(resp.text)
                # 确认页面标题包含产品名（避免通用目录页）
                if product.lower() in text.lower()[:800]:
                    best_url = url
                    break
        except Exception:
            continue

    if best_url:
        output.basic.official_website.value = best_url
        if best_url not in output.basic.official_website.sources:
            output.basic.official_website.sources.append(best_url)

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


async def research_product(product_name: str) -> ProductInfo:
    """执行产品信息调研。"""
    result = await _graph.ainvoke({"product_name": product_name})
    output = result.get("output")
    if output is None:
        raise ValueError("Agent did not return structured output")
    return output
