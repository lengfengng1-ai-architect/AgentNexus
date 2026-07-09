"""web_fetch 工具：将 httpx 抓取 + HTML 提取逻辑封装为 LangChain Tool，供所有 agent 调用。

OpenSpec: changes/product-research-tool-calling (web-fetch-tool)
superpowers in_scope ID: web-fetch-tool
"""

from httpx import AsyncClient, HTTPError, TimeoutException
from langchain_core.tools import tool
from pydantic import BaseModel, Field

from app.agents.llm_utils import write_log
from app.utils import extract_text_from_html

FETCH_TIMEOUT = 10
MAX_PAGE_CHARS = 4000
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
SKIP_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".zip", ".jpg", ".png", ".gif",
    ".ppt", ".pptx", ".xls", ".xlsx",
}


class WebFetchInput(BaseModel):
    url: str = Field(..., description="要抓取的页面 URL")


@tool(args_schema=WebFetchInput)
async def web_fetch(url: str) -> str:
    """抓取指定 URL 的网页内容，返回纯文本（脱 HTML，最多 4000 字符）。非 HTML 内容或网络错误时返回提示文本，不抛异常。"""
    path_part = url.split("?")[0].lower()
    if any(path_part.endswith(ext) for ext in SKIP_EXTENSIONS):
        return "跳过：非 HTML 文件链接"

    write_log("product_research", f"📄 web_fetch：{url}")
    try:
        async with AsyncClient(timeout=FETCH_TIMEOUT) as client:
            resp = await client.get(url, headers={"User-Agent": USER_AGENT}, follow_redirects=True)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if "text/html" not in content_type and "application/xhtml" not in content_type:
                write_log("product_research", f"⚠️ {url} 非 HTML 内容，跳过")
                return "跳过：非 HTML 内容"
            text = extract_text_from_html(resp.text) or ""
            if len(text) > MAX_PAGE_CHARS:
                text = text[:MAX_PAGE_CHARS] + "\n...[内容截断]"
            write_log("product_research", f"✓ web_fetch 成功（{len(text)} 字符）")
            return text or "页面内容为空"
    except TimeoutException:
        write_log("product_research", f"⏱️ {url} 请求超时，跳过")
        return "抓取失败：请求超时"
    except HTTPError as exc:
        write_log("product_research", f"⚠️ {url} HTTP 错误，跳过")
        return f"抓取失败：HTTP 错误 {exc}"
    except Exception as exc:
        write_log("product_research", f"⚠️ {url} 读取失败，跳过")
        return f"抓取失败：{exc}"
