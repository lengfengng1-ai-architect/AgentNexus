## Why

当前 SSE 流式端点的实现是伪流式：7 个 LLM 调用在 Agent 内部串行跑完后，service 层才一口气发 7 个 progress + 1 个 result。客户端在约 1-3 分钟内看不到任何实际数据推进。

真流式的价值：
- 客户端每 10-30 秒就能收到一个节点的结构化数据，实时展示
- 节点失败不影响已完成的节点数据
- 用户能看到"定义完成→规模估算完成..."的真实推进

## What Changes

- 将 `market_analysis_agent.py` 中的 7 个 LLM 调用提取为公共函数。
- 重写 `market_analysis_service.py` 的 `analyze_stream`：逐节点调用 LLM，每完成一个节点 yield 3 个事件（progress + data + end），节点数据作为 data 事件的内容。
- 新增 SSE 事件类型：`data` 事件携带该节点的结构化输出。
- 同步端点 `POST /api/v1/market-analysis` 不变，仍然等待全部完成返回全量。
- 新增 SSE 事件协议兼容历史客户端（仍在 result 事件中返回全量结果）。

## Capabilities

### New Capabilities
- `market-analysis-stream-v2`: 真流式 SSE 输出，每节点完成即推送结构化数据。

## Impact

- `backend/app/agents/market_analysis_agent.py`：提取公共函数，Agent 只保留同步全量调用。
- `backend/app/services/market_analysis_service.py`：`analyze_stream` 重写为逐节点 yield。
- `backend/app/schemas/market_analysis.py`：新增 `MarketResearchDataEvent` 模型。
- 同步端点和 API YAML 不变。
- 前端 SSE 解析逻辑无需改（progress/result 事件格式不变，新增 data 事件可选消费）。

## Non-goals

- 不改同步端点。
- 不改 mock 模式。
- 不改前端。
