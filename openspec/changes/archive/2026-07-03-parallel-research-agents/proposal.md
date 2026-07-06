## Why

当前 `plan_generation_service.py` 中的 LangGraph 图是纯串行的：product_research → market_research → audience_insight → ...。三个调研 agent 互不依赖，串行执行浪费时间（总耗时 = 三者之和）。改为并行后总耗时 ≈ 最慢的那个 agent。

对应 superpowers in_scope ID: `plan-generation`

## What Changes

- 修改 `plan_generation_service.py` 的 `_build_graph()` 函数，将前三个调研节点（product_research、market_research、audience_search）从串行改为并行 fan-out
- 新增 `audience_search` 节点（调用已注册的 `audience_search` handler），与 product_research、market_research 同时执行
- 新增 `audience_insight` 作为 fan-in 节点，等三个调研节点都完成后综合生成用户画像
- 修改 `PlanState` TypedDict，新增 `audience_search` 字段存储人群搜索原始数据
- 确保并行节点各写不同的 state key（无需 reducer）
- mock 数据覆盖：每个 handler 执行后自动存到 `mock_data/` 对应目录（已实现）

## Capabilities

### New Capabilities

（无新 capability，复用现有 plan-generation）

### Modified Capabilities

- `plan-generation-pipeline`: 前三个调研节点从串行改为并行执行

## Impact

- `backend/app/services/plan_generation_service.py` — 图结构改动 + PlanState 改动
- SSE 流式输出需适配并行节点（三个同时 running）
- 不影响其他 agent 的注册和实现
- 不影响 API 端点签名
