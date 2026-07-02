## Why

当前 `/chat` 页面已经能通过 `chat_pipeline` 识别用户意图并抽取品牌字段，但 `generate_plan` 意图缺少后续执行路径。用户无法看到方案生成过程中各 Agent 的执行状态，也无法在一个专门的工作台中查看、编辑和预览完整营销方案。本 change 将新增 `/plan` 方案生成工作台页面，配合 SSE 流式推送的 Agent 流水线可视化，把从一句话需求到 9 章营销方案的体验闭环补齐。

## What Changes

- 新增 `/plan` 前端页面：左侧会话摘要 + 可编辑品牌表单，右侧 Agent 流水线 + 方案预览 + 行动建议。
- 扩展 `chat_pipeline` 在 `generate_plan` 意图完成后的前端交互：字段完整时展示"生成方案"入口，点击后携带 `brand_input` 跳转 `/plan`。
- 新增后端 `plan_generation_pipeline` 工作流：串联需求校验、市场调研、人群洞察、数据查询、适配度分析、策略生成、执行规划、预算与 KPI、行动建议 9 个 Agent 节点。
- 工作流运行接口支持 SSE 流式推送：返回 `node.start` / `node.log` / `node.complete` / `node.failed` / `workflow.complete` 等事件。
- 新增/扩展 7 个 Agent 节点：`audience_insight`、`fitness_analysis`、`strategy_generation`、`execution_planning`、`budget_kpi`、`action_recommendations`，并复用/增强现有 `market_research` 和 `data_query`。
- 新增前端 SSE 消费组件、Agent 流水线状态组件、方案章节渲染组件。
- 新增对应后端测试和前端基础测试，覆盖率保持 ≥80%。

## Capabilities

### New Capabilities

- `plan-generation-pipeline`：基于品牌输入串行执行 9 个 Agent 节点，生成 9 章营销方案。
- `plan-generation-workbench`：前端 `/plan` 页面，支持 Agent 流水线可视化、方案预览、行动建议展示。
- `workflow-sse-streaming`：工作流运行 API 支持 SSE 流式状态推送。

### Modified Capabilities

- `chat-preview-frontend`：在 `generate_plan` 意图且字段完整时，增加"生成方案"跳转入口；其他意图保持现有对话气泡不变。
- `workflow-orchestration`：扩展工作流运行接口，支持 SSE 流式响应和节点级失败阻塞恢复。

## Impact

- 后端：新增 Agent 模块、新增 `plan_generation_pipeline.yaml`、扩展 `workflow_service.py` 和 `workflows.py` 支持 SSE。
- 前端：新增 `/plan` 路由和页面组件、扩展 `useChat` hook、新增 SSE hook 和流水线组件。
- 依赖：无新 Agent 框架或包管理器，后端继续用 LangGraph + DeepAgents，前端继续用 React + TypeScript + Tailwind。
- Mock 数据：MVP 阶段继续使用 `backend/mock_data/` 中的城市/赛事/达人/盟域/场馆/经营社/人群画像数据。
