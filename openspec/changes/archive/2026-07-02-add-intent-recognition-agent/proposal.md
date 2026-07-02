## Why

当前用户输入直接进入 `chat_extraction` 节点提取品牌字段，系统无法区分用户是想生成营销方案、查询 AllyGo 数据、补充已有信息还是闲聊。这导致对话入口僵化，多轮交互（如修改城市或预算）无法被自然处理。需要一个意图识别 Agent 作为工作流入口，判断用户意图并驱动下游节点，提升对话灵活性和可配置性。

## What Changes

- 新增 `intent-recognition` capability：在工作流编排底座中注册一个可复用的意图识别 Agent 节点。
- 扩展 workflow orchestrator：在 `WorkflowNode` 中增加 `condition` 字段，支持 JSONPath 布尔表达式；编排器根据条件构建 LangGraph 条件边，实现基于意图的分支路由。
- 新增 `data-query-agent`：作为 `query_data` 意图的下游节点，按城市/运动类型查询 AllyGo mock 数据并返回结构化摘要。
- 新建 `chat-pipeline` 工作流 YAML：包含 `intent_recognition`、`chat_extraction`/`data_query`/`end_reply` 三个条件分支，展示意图驱动的完整对话流程。
- 新增 `POST /api/v1/workflows/chat-pipeline/run` 的运行示例，复用现有工作流运行 API。
- 新增/更新测试：覆盖意图识别 Agent、data_query_agent、条件边构建、chat-pipeline 工作流运行。

## Capabilities

### New Capabilities

- `intent-recognition`: 识别用户输入意图，输出 `intent`、`confidence`、`reply`、`brand_input`、`missing_fields`、`updated_fields`，驱动下游工作流分支。对应 superpowers in_scope ID `workflow-orchestration`（作为编排底座的一部分）。
- `data-query-agent`: 接收意图识别输出的城市/品类等字段，返回 AllyGo 平台 mock 数据摘要。对应 superpowers in_scope ID `data-query`。

### Modified Capabilities

- `workflow-orchestration`: 在现有编排底座上扩展条件边能力，使工作流节点支持 `condition` 字段和基于意图的条件路由。对应 superpowers in_scope ID `workflow-orchestration`。

## Impact

- `backend/app/agents/orchestrator.py`: 新增条件边解析与构建逻辑。
- `backend/app/schemas/workflow.py`: `WorkflowNode` 新增 `condition` 字段。
- `backend/app/agents/intent_recognition_agent.py`: 新增意图识别 Agent 入口。
- `backend/app/agents/data_query_agent.py`: 新增数据查询 Agent 入口。
- `backend/app/prompt_templates/intent_recognition.md.j2`: 新增 prompt 模板骨架。
- `backend/workflows/chat_pipeline.yaml`: 新增示例工作流。
- `backend/tests/test_agents/test_intent_recognition.py` 等：新增测试覆盖。
- 现有 `chat_extraction_agent` 保留，但不再是唯一入口，条件路由下复用。

## Non-goals

- 不实现前端对话界面改动，本次只调整后端 Agent 和工作流。
- 不实现真实外部数据接入，数据查询继续使用 MVP mock 数据。
- 不实现用户认证、会话持久化、跨平台数据接入、竞品分析等 out_scope 能力。
