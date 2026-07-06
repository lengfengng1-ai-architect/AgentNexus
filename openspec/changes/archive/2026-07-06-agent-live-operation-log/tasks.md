## 1. SSE 映射层

- [x] 1.1 `_translate_event` 增加 `on_custom_event("log")` → `node.log` SSE 帧的映射
- [x] 1.2 确认 `node.log` 事件携带 `run_id`、`node_id`、`message` 字段

## 2. product_research_agent 拆图加日志

- [x] 2.1 `run_product_research` 改为顺序调用 search/fetch/extract/enrich 节点，不再使用内部 `_graph.ainvoke()`
- [x] 2.2 搜索步骤前加 `dispatch_custom_event("log", ...)` — "🔍 正在搜索…"
- [x] 2.3 抓取步骤前加日志 — "📄 正在读取页面…"，每个 URL 成功抓取后加日志
- [x] 2.4 LLM 分析前加日志 — "🤖 正在用 AI 分析页面内容…"
- [x] 2.5 官网补充前加日志 — "🌐 正在补充官网信息…"
- [x] 2.6 完成前加日志 — "✓ 产品调研完成"

## 3. audience_insight_agent 拆图加日志

- [x] 3.1 `run_audience_insight_full` 改为顺序调用 search/fetch/extract/generate 节点，不再使用内部 `_graph.ainvoke()`
- [x] 3.2 搜索/抓取/LLM/生成画像各步骤前加日志

## 4. 简单 Agent 加日志

- [x] 4.1 `market_research_agent` — 7 个步骤分别加 "🤖 正在分析行业趋势…" / "🤖 正在分析竞争格局…" 等
- [x] 4.2 `strategy_generation_agent` — LLM 调用前加 "🤖 正在制定营销策略…"
- [x] 4.3 `execution_planning_agent` — LLM 调用前加 "📊 正在规划执行方案…"
- [x] 4.4 `budget_kpi_agent` — LLM 调用前加 "📊 正在测算预算和 KPI…"
- [x] 4.5 `action_recommendations_agent` — LLM 调用前加 "📊 正在生成行动建议…"
- [x] 4.6 `plan_generator_agent` — 每章生成前加 "🤖 正在生成第 N 章：{title}…"

## 5. 测试

- [x] 5.1 确认 `node.log` 事件在前端正确展示
