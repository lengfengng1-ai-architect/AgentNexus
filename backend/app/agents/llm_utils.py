"""LLM utility helpers for agent nodes.

Corresponding in_scope ID: workflow-orchestration
"""

import json
import logging
from typing import Any, AsyncGenerator
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from httpx import AsyncClient
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage

from app.config.settings import settings

logger = logging.getLogger(__name__)

_log_buffer: list[dict[str, str]] = []
# Cache for model instances keyed by provider name.
_model_cache: dict[str, Any] = {}

# 非中文顶级域名——搜索结果中这些 TLD 的页面大概率不是中文内容
NON_CN_TLDS = {
    ".jp", ".kr", ".ru", ".de", ".fr", ".uk", ".it", ".es", ".pt",
    ".nl", ".pl", ".se", ".no", ".fi", ".dk", ".be", ".at", ".ch",
    ".th", ".id", ".vn", ".ph", ".my", ".sg", ".in",
    ".ir", ".il", ".sa", ".ae", ".tr",
    ".br", ".ar", ".cl", ".mx",
    ".za", ".eg", ".ng",
    ".ua", ".ro", ".hu", ".cz", ".gr", ".sk", ".hr",
}
# 已知非中文站点域名（.com/.org/.info 等通用 TLD 下的非中文站）
# 从复盘日志中发现，防止它们挤占中文内容的搜索槽位
NON_CN_DOMAINS = {
    # 英文问答
    "stackexchange.com", "stackoverflow.com", "superuser.com",
    "serverfault.com", "askubuntu.com", "mathoverflow.net",
    # 英文站点
    "usps.com", "ups.com", "fedex.com", "dhl.com",
    "merchant.wish.com",
    "github.com", "gitlab.com", "bitbucket.org",
    "npmjs.com", "pypi.org", "crates.io",
    "developer.mozilla.org",
    # 日文站点
    "dmm.com", "eikaiwa.dmm.com",
    "tabelog.com", "hotpepper.jp",
    "navitime.co.jp", "yahoo.co.jp",
    "everytown.info",
    # 台湾站点不处理（语言相通）
}


def write_log(node_id: str, message: str) -> None:
    """Append a live operation log message to the shared buffer."""
    _log_buffer.append({"node_id": node_id, "message": message})


def drain_logs() -> list[dict[str, str]]:
    """Drain and return all pending log messages."""
    items = list(_log_buffer)
    _log_buffer.clear()
    return items


_HTTP_TIMEOUT = 15
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


def is_non_cn_url(url: str) -> bool:
    """若 URL 指向非中文内容站点，返回 True。

    用于搜索去重阶段过滤非中文页面，避免挤占有限抓取槽位。
    判断依据：TLD 过滤 + 已知非中文域名黑名单。
    """
    hostname = urlparse(url).hostname or ""
    lower = hostname.lower()
    # 以 .cn 结尾的一定是国内站
    if lower.endswith(".cn"):
        return False
    # .com.br / .com.au 等带国家二级域的通过主域名判断
    # 1. TLD 黑名单
    for tld in NON_CN_TLDS:
        if lower.endswith(tld):
            return True
    # 2. 已知非中文站点黑名单
    for domain in NON_CN_DOMAINS:
        if lower == domain or lower.endswith("." + domain):
            return True
    return False


async def duckduckgo_search(keyword: str, max_results: int = 10) -> list[dict[str, str]]:
    """Search DuckDuckGo via its HTML endpoint.

    Single HTTP request to html.duckduckgo.com, avoids DDGS library's
    multi-engine fan-out that waits for slow/timeout engines.

    Returns a list of {href, title, body} dicts, same shape as DDGS.text().
    """
    from urllib.parse import parse_qs, urlparse

    async with AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(
            "https://html.duckduckgo.com/html/",
            headers={"User-Agent": _USER_AGENT},
            data={"q": keyword},
            follow_redirects=True,
        )
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    results: list[dict[str, str]] = []

    for el in soup.select(".result"):
        link = el.select_one(".result__a")
        snippet = el.select_one(".result__snippet")
        if not link:
            continue

        raw_href = link.get("href", "")
        # DDG uses redirect links like //duckduckgo.com/l/?uddg=<encoded_url>
        parsed = urlparse(raw_href)
        if parsed.netloc and "duckduckgo.com" in parsed.netloc:
            qs = parse_qs(parsed.query)
            actual_url = qs.get("uddg", [None])[0] or raw_href
        else:
            actual_url = raw_href

        results.append({
            "href": actual_url,
            "title": link.get_text(strip=True),
            "body": snippet.get_text(strip=True) if snippet else "",
        })
        if len(results) >= max_results:
            break

    return results


async def searxng_search(keyword: str, max_results: int = 10) -> list[dict[str, str]]:
    """Search via self-hosted SearxNG JSON API.

    Returns a list of {href, title, body} dicts, same shape as duckduckgo_search
    for seamless swap.
    """
    from urllib.parse import urlencode

    params = {
        "q": keyword,
        "format": "json",
        "engines": "bing,baidu",
        "language": "zh-CN",
    }
    url = f"{settings.searxng_url.rstrip('/')}/search?{urlencode(params)}"

    async with AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(url, headers={"User-Agent": _USER_AGENT})
        resp.raise_for_status()
        data = resp.json()

    results: list[dict[str, str]] = []
    for item in data.get("results", []):
        href = item.get("url", "")
        title = item.get("title", "")
        body = item.get("content", "")
        if href:
            results.append({"href": href, "title": title, "body": body})
        if len(results) >= max_results:
            break

    return results



def build_chat_model():
    """Initialize the configured chat model (cached by provider).

    Model instance is cached per provider.  Call clear_model_cache() to
    force re-initialization (useful in tests that change provider settings).
    """
    provider = settings.llm_provider
    if provider in _model_cache:
        return _model_cache[provider]

    if provider == "agnes":
        model = init_chat_model(
            model=settings.agnes_model,
            model_provider="openai",
            api_key=settings.agnes_api_key,
            base_url=settings.agnes_base_url,
        )
    elif provider == "myself":
        model = init_chat_model(
            model=settings.myself_model,
            model_provider="openai",
            api_key=settings.myself_api_key,
            base_url=settings.myself_base_url,
        )
    else:
        model = init_chat_model(
            model=settings.dashscope_model,
            model_provider="openai",
            api_key=settings.dashscope_api_key,
            base_url=settings.dashscope_base_url,
        )
    _model_cache[provider] = model
    return model


def clear_model_cache() -> None:
    """Clear cached model instances (for testing when provider changes)."""
    _model_cache.clear()


async def stream_chat(
    system_prompt: str,
    user_msg: str,
) -> AsyncGenerator[str, None]:
    """Stream LLM response token by token, yielding text content.

    Uses cached model instance (see build_chat_model).
    Empty chunks (e.g. during model thinking) are skipped.
    """
    model = build_chat_model()
    async for chunk in model.astream([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_msg),
    ]):
        if isinstance(chunk.content, str) and chunk.content:
            yield chunk.content


async def invoke_json(system_prompt: str, user_msg: str) -> dict[str, Any]:
    """Invoke LLM and parse JSON from markdown code fences if present.

    ponytail: 重试 1 次以应对 LLM 偶发的 JSON 格式溢出。
    """
    for attempt in (1, 2):
        try:
            msg = await build_chat_model().ainvoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_msg + ("\n\n注意：请只输出有效的 JSON，不要包含其他文字。" if attempt == 2 else "")),
            ])
            raw = (msg.content or "").strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1]
                if raw.endswith("```"):
                    raw = raw[:-3]
                raw = raw.strip()
            return json.loads(raw)
        except (json.JSONDecodeError, ValueError) as exc:
            if attempt == 1:
                logger.warning("invoke_json JSON parse failed (attempt 1/2), retrying… error=%s", exc)
            else:
                raise
