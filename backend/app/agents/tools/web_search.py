"""web_search 工具：将 searxng_search 封装为 LangChain Tool，供所有 agent 调用。

OpenSpec: changes/product-research-tool-calling (web-search-tool)
superpowers in_scope ID: web-search-tool
"""

from urllib.parse import urlparse

from langchain_core.tools import tool
from pydantic import BaseModel, Field

from app.agents.llm_utils import searxng_search, write_log

# 已知 403 屏蔽爬虫的域名
BLOCKED_DOMAINS = {"zhuanlan.zhihu.com", "baike.baidu.com", "wenku.baidu.com"}
# 非网页文件后缀，直接跳过
SKIP_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".zip", ".jpg", ".png", ".gif",
    ".ppt", ".pptx", ".xls", ".xlsx",
}


class WebSearchInput(BaseModel):
    query: str = Field(..., description="搜索关键词")
    max_results: int = Field(default=8, description="返回结果数量上限，默认 8")


@tool(args_schema=WebSearchInput)
async def web_search(query: str, max_results: int = 8) -> str:
    """搜索 Web，返回与关键词相关的页面列表。每条包含标题、URL、摘要。无结果或失败时返回提示文本，不抛异常。"""
    write_log("web_search", f"🔎 web_search：{query}（max={max_results}）")
    try:
        raw = await searxng_search(query, max_results=max_results)
    except Exception as exc:
        write_log("product_research", f"⚠️ web_search 失败：{exc}")
        return f"搜索失败：{exc}"

    if not raw:
        return "搜索无结果"

    seen: set[str] = set()
    lines: list[str] = []
    for item in raw:
        url = item.get("href", "")
        if not url or url in seen:
            continue
        host = urlparse(url).hostname or ""
        if host in BLOCKED_DOMAINS:
            continue
        path_part = url.split("?")[0].lower()
        if any(path_part.endswith(ext) for ext in SKIP_EXTENSIONS):
            continue
        seen.add(url)
        lines.append(
            f"标题: {item.get('title', '')}\nURL: {url}\n摘要: {item.get('body', '')}"
        )

    if not lines:
        return "搜索无结果（已过滤非网页链接）"
    return "\n\n".join(lines)
