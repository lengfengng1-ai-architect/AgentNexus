"""Agent 共享 Tool 目录。

OpenSpec: changes/product-research-tool-calling (web-search-tool / web-fetch-tool)
"""

from app.agents.tools.web_fetch import web_fetch
from app.agents.tools.web_search import web_search

web_search_tool = web_search
web_fetch_tool = web_fetch

__all__ = ["web_search_tool", "web_fetch_tool"]
