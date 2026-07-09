## 1. 人群洞察 Agent 添加 ReAct 工具调用

- [x] 1.1 `audience_insight_agent.py` — State 新增 `messages`（Annotated[list, add_messages]）和 `tool_call_count: int` 字段
- [x] 1.2 `audience_insight_agent.py` — import 新增 `add_messages`、`ToolNode`、`web_search_tool`、`web_fetch_tool`
- [x] 1.3 `audience_insight_agent.py` — 新增 `agent_node`（LLM 绑定 web_search/web_fetch tool）
- [x] 1.4 `audience_insight_agent.py` — 新增 `_route_after_agent`（有 tool call 且 <3 轮 → tools，否则 → extract_audience）
- [x] 1.5 `audience_insight_agent.py` — 图构建中新增 `agent` 和 `tools` 节点，`fetch → agent → (tools → agent 循环) → extract_audience`
- [x] 1.6 新增 `app/prompt_templates/audience_insight_react.md.j2` — ReAct 系统提示模板（告诉 LLM 需要补充哪类人群信息）
- [x] 1.7 更新 `openspec/specs/audience-insight/spec.md` — 同步新增的 Tool Calling 要求

## 2. 市场调研 Agent 重构为 LangGraph 并添加 ReAct

- [x] 2.1 `market_research_agent.py` — 定义 State 类（含 search_results、fetched_pages、messages、tool_call_count、output）
- [x] 2.2 `market_research_agent.py` — 新建 `search_node`（包装现有 `_search` 逻辑）
- [x] 2.3 `market_research_agent.py` — 新建 `fetch_node`（包装现有 `_fetch` 逻辑）
- [x] 2.4 `market_research_agent.py` — 新增 `agent_node`（LLM 绑定 web_search/web_fetch tool）
- [x] 2.5 `market_research_agent.py` — 新增 `_route_after_agent` 条件路由
- [x] 2.6 `market_research_agent.py` — 新建 `extract_node`（包装现有 `_extract` 逻辑，输入来自 state）
- [x] 2.7 `market_research_agent.py` — 构建 StateGraph：`search_node → fetch_node → agent ↔ tools → extract_node → END`
- [x] 2.8 `market_research_agent.py` — `run_market_research` 改造：mock 模式保持入口拦截，正常模式改为 `_graph.ainvoke()`
- [x] 2.9 新增 `app/prompt_templates/market_research_react.md.j2` — ReAct 系统提示模板（告诉 LLM 需要补充哪类市场信息）

## 3. 测试覆盖

- [x] 3.1 `tests/test_agents/test_audience_insight_agent.py` — 覆盖 ReAct 路径：信息充足不调 tool、信息不足 1 轮补充、超过 3 轮强制退出
- [x] 3.2 `tests/test_agents/test_market_research_agent.py` — 覆盖 StateGraph 正常运行 + ReAct 路径
