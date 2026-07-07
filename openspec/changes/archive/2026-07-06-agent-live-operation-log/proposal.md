# Agent 实时操作日志

## Why

当前 Agent 执行时，用户只能看到 `node.start` → `node.complete` 两个事件，中间的搜索、抓取、分析、计算等具体操作完全不可见。用户不知道 agent 正在做什么、进度如何，体验像黑盒。

通过在每个 agent 的关键操作点实时推送操作日志，用户可以实时看到 agent 正在搜索什么关键词、访问了哪些网页、正在用 AI 分析内容等，提升透明度和可信度。

## What Changes

- **后端 SSE 协议新增 `node.log` 事件** — `_translate_event` 将 agent 内的 `dispatch_custom_event("log", {"message": ...})` 映射为 SSE `node.log` 帧
- **product_research_agent 拆图** — 将内部嵌套的 `_graph.ainvoke()` 展开为 `run_product_research` 内的顺序调用（search → fetch → extract → enrich），每步前后加 `dispatch_custom_event`
- **audience_insight_agent 拆图** — 同上，search → fetch → extract_audience → generate_persona，每步前后加日志
- **其余 6 个简单 agent** — 在入口/出口/LLM 调用等关键点插入 `dispatch_custom_event`
- **前端** — 无需额外改动，`node.log` 事件会经 `state.logs → nodeLogs` 自动展示在 PipelineTimeline 日志面板

## Capabilities

### New Capabilities

- `agent-operation-log` — Agent 实时操作日志推送能力，供所有 Agent 节点在执行关键步骤时推送进度消息

### Modified Capabilities

- `plan-generation-pipeline` — SSE 事件表新增 `node.log` 事件类型，前端按现有 `nodeLogs` 逻辑自动展示

## Impact

| 层面 | 影响 |
|------|------|
| 后端文件 | `plan_generation_service.py` — `_translate_event` 新增 `on_custom_event` 处理 `log`（≤10 行） |
| 后端文件 | `product_research_agent.py` — `run_product_research` 重构为顺序调用 + 日志（~50 行改动） |
| 后端文件 | `audience_insight_agent.py` — `run_audience_insight` 重构为顺序调用 + 日志（~50 行改动） |
| 后端文件 | `strategy_generation_agent.py` — 加日志（≤5 行） |
| 后端文件 | `execution_planning_agent.py` — 加日志（≤5 行） |
| 后端文件 | `budget_kpi_agent.py` — 加日志（≤5 行） |
| 后端文件 | `action_recommendations_agent.py` — 加日志（≤5 行） |
| 后端文件 | `plan_generator_agent.py` — 加日志（≤5 行） |
| 后端文件 | `market_research_agent.py` — 加日志（≤5 行） |
| 前端 | 无改动（上一轮已完成） |
