## Why

当前 `product_research_agent.py` 使用固定 DAG（search → fetch → extract → enrich_website），LLM 只参与一次结构化输出，无法自主决定搜索策略。同时 search/fetch 逻辑与其他 agent（market_research、audience_insight）高度重复，且无法被复用。

通过引入 Tool Calling，让 LLM 在批量搜索抓取后能自主决定是否需要补充搜索，同时将搜索/抓取能力提取为独立可复用的 Tool。

## What Changes

- **提取** `web_search`/`web_fetch` 两个 LangChain Tool 到 `backend/app/agents/tools/` 目录，可供所有 agent import 使用
- **改造** `product_research_agent.py` 内部架构：固定 DAG → Hybrid 模式（批量搜索抓取 + ReAct 循环）
- **保持** 外部 handler `run_product_research()` 的签名和返回值不变，`ProductResearchResult` schema 不变，已有测试兼容

## Capabilities

### New Capabilities
- `web-search-tool`: 将现有的 searxng_search + 去重过滤逻辑封装为 LangChain BaseTool，供所有 agent 调用。输入是 query + max_results，输出是格式化的搜索结果字符串。
- `web-fetch-tool`: 将现有的 httpx 并发抓取 + HTML 提取逻辑封装为 LangChain BaseTool。输入是 URL，输出是纯文本页面内容。

### Modified Capabilities
- `product-research`: 内部架构从固定 DAG 改为 Hybrid（批量并行搜索抓取 + ReAct 自主查漏补缺），新增 tool calling 能力。外部行为不变。

## Impact

| 文件 | 改动 |
|------|------|
| `backend/app/agents/tools/__init__.py` | **新建** — 导出 web_search_tool / web_fetch_tool |
| `backend/app/agents/tools/web_search.py` | **新建** — 从 product_research.search_node / market_research._search 提取 |
| `backend/app/agents/tools/web_fetch.py` | **新建** — 从 product_research.fetch_node / audience_insight.fetch_node 提取 |
| `backend/app/agents/product_research_agent.py` | **重写** — 内部 DAG → Hybrid LangGraph |
| `backend/app/agents/__init__.py` | 确保 tools 模块被导入 |
| `backend/app/prompt_templates/product_research.md.j2` | **调整** — 改写成适合 ReAct 循环的 agent prompt |
| `backend/tests/test_agents/test_product_research_agent.py` | **更新** — mock 路径适配新的内部图结构 |
| `backend/tests/test_agents/test_product_research_extra.py` | **更新** — 适配新结构 |
| `backend/app/agents/llm_utils.py` | 无改动（复用已有 build_chat_model） |
| `backend/app/services/plan_generation_service.py` | **不改** |
