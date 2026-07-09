## 1. 创建 Tool 目录和基础工具

- [ ] 1.1 创建 `backend/app/agents/tools/` 目录及 `__init__.py`，导出 `web_search_tool` 和 `web_fetch_tool`
- [ ] 1.2 实现 `tools/web_search.py`：从现有 `search_node` 提取核心逻辑（searxng_search + 去重 + 域名过滤），封装为 LangChain BaseTool，Pydantic schema 定义 query + max_results 参数，返回格式化文本
- [ ] 1.3 实现 `tools/web_fetch.py`：从现有 `fetch_node` 提取核心逻辑（httpx 请求 + HTML 提取 + 截断 + 错误处理），封装为 LangChain BaseTool，Pydantic schema 定义 url 参数，返回纯文本内容
- [ ] 1.4 确认 tools 可被正确 import：`from app.agents.tools import web_search_tool, web_fetch_tool`

## 2. 改造 product_research_agent.py

- [ ] 2.1 重写 agent 内部 LangGraph 图结构：Hybrid 模式（Step 1: batch_search_fetch 节点 → Step 2: ReAct 循环）
- [ ] 2.2 实现 batch_search_fetch_node：复用现有 3 关键词并行搜索 + 并发抓取 top 25 页面的代码，输出 initial_pages + seen_urls
- [ ] 2.3 实现 ReAct 循环（agent_node + tools_node）：agent_node 绑定 web_search、web_fetch tool，并注入 initial_pages 内容到 prompt；tools_node 使用 LangGraph ToolNode；conditional edge 判断是否调 tool 或结束
- [ ] 2.4 实现 finalize_node：用 `with_structured_output(ProductResearchResult)` 做最终输出，复用 `_fill_sourced_fields` 溯源逻辑
- [ ] 2.5 设置最大 3 轮 tool calling 限制（计数器在 state 中），超限强制进入 finalize
- [ ] 2.6 确保 `run_product_research()` handler 的接口不变：签名、返回值、retry 逻辑、_save_to_cache 均不动
- [ ] 2.7 确保 `register("product_research", run_product_research)` 不变

## 3. 调整 Prompt 模板

- [ ] 3.1 修改 `product_research.md.j2`：改为适合 ReAct 循环的 agent prompt，告知 LLM 已有 initial_pages 内容、可用 tool 列表、自主决定是否补充搜索、"信息充足则直接输出"的指令

## 4. 更新测试

- [ ] 4.1 更新 `test_product_research_agent.py`：适配新的图结构（mock 路径从 `_graph` 改为新引用名），测试逻辑不变
- [ ] 4.2 更新 `test_product_research_extra.py`：适配新的图结构
- [ ] 4.3 运行全部测试确认兼容：`cd backend && python -m pytest tests/test_agents/test_product_research*.py -v`

## 5. 验证

- [ ] 5.1 确认 `backend/app/agents/__init__.py` 中 tools 模块已被导入（或不需要，因为 tools 是被 agent import 的）
- [ ] 5.2 确认 `plan_generation_service.py` 无改动且能正常导入 agent 模块
- [ ] 5.3 运行 `cd backend && python -m pytest tests/ -v` 确认无回归
