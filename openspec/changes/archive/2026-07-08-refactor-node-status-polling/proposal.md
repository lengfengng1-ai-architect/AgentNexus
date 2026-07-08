## Why

Agent 流水线节点状态（执行中/完成/失败）原本依赖 SSE 事件驱动（`node.start/node.complete`），但 LangGraph resume replay 会重放 `on_chain_start` 事件给已执行节点，且去重逻辑仅覆盖输出非空的节点——空输出节点（如 `plan_data_query` 查不到数据）会被重复标记为"执行中"，导致前端节点状态闪烁、auto-highlight 错误跳转。此外 SSE 状态不做持久化，刷新页面后节点状态丢失。

## What Changes

- **新增 `plan_node_status` 表**：后端在节点执行开始/完成/失败时写入状态，持久化到 SQLite
- **节点状态改为前端轮询驱动**：`refreshStatus` 每次调 `get_status` 时读取 `outputs.node_statuses`，通过 `SYNC_NODE_STATUSES` action 细粒度同步节点状态
- **移除 node.start/node.complete SSE 对节点状态的依赖**：SSE 不再承担状态同步职责，只保留 `workflow.paused/completed/chapters`
- **`RESTORE_STATUS` 同时读 `node_statuses`**：刷新页面恢复时用 DB 表数据做精准恢复
- **`SYNC_NODE_STATUSES` reducer action**：逐个节点细粒度更新，不触发全量 `RESTORE_STATUS`

## Capabilities

### New Capabilities

无新增 capability。这是对 `plan-generation-pipeline` 内部的节点状态同步机制的纯重构。

### Modified Capabilities

- `plan-generation-pipeline`: 节点状态同步机制从 SSE 事件驱动改为后端写表 + 前端轮询，不改变节点的业务逻辑和输出格式

## Impact

- **后端**: `plan_generation_service.py` 新增 `plan_node_status` 表、`_save_node_status/load_node_statuses` 辅助函数、`_build_node` 中写入节点状态
- **前端**: `usePlanRun.ts` 新增 `SYNC_NODE_STATUSES` action 和 reducer case；`refreshStatus` 每次轮询都同步节点状态；`PlanOutputs` 增加 `node_statuses` 类型
- **不涉及**: API 契约变更、新依赖、目录结构调整
