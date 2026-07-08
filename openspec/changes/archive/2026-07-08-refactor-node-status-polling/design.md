## Context

Agent 流水线节点状态（running/complete/failed）通过 SSE `node.start`、`node.complete` 事件驱动前端状态机。LangGraph resume replay 会重放 `on_chain_start` 事件，后端 `started` 去重集仅覆盖输出非空的节点，导致空输出节点（如 `plan_data_query` 查询无数据返回 `{}`）被重复标记 running。此外 SSE 无持久化，刷新页面后节点状态完全丢失。

本次改为后端写 `plan_node_status` 表 + 前端轮询读取，SSE 退出节点状态同步职责。

## Goals / Non-Goals

**Goals:**
- 节点状态持久化到 SQLite，刷新页面不丢失
- 前端每 5s 轮询 `get_status` 同步节点状态，细粒度更新不触发全量 `RESTORE_STATUS`
- SSE 不再发送 `node.start/node.complete/node.log`，仅保留 `workflow.paused/completed/chapters`

**Non-Goals:**
- 不改变节点业务逻辑和 handler 实现
- 不改变 API 契约（`GET /plan/runs/{run_id}/status` 返回结构）

## Decisions

### 1. 独立表 vs 扩展现有 `plan_records`
`plan_node_status` 表用 `(run_id, node_id)` 联合主键，每行一个节点。扩展 `plan_records` 列的方案不够清晰（JSON 内嵌不便查询）。
**选择**: 独立表，`run_id + node_id` 主键，`status + started_at + completed_at` 字段。

### 2. 写入时机
`_build_node` 的 `node_fn` 中 handler 执行前写 `running`，成功写 `complete`，异常写 `failed`。
**选择**: 同步写入（同 `node_fn` async），因为 `run_id` 在 `_current_run_id` 全局变量中。

### 3. 前端同步方式
不触发全量 `RESTORE_STATUS`（避免 clobber 节点状态），而是新增 `SYNC_NODE_STATUSES` reducer action，逐个节点比较更新。
**选择**: `refreshStatus` 每次轮询 dispatch `SYNC_NODE_STATUSES`；`RESTORE_STATUS` 同时读 `outputs.node_statuses` 做精准恢复。

## Risks / Trade-offs

- **写表延迟**: 节点 handler 执行前同步写 DB 可能引入数毫秒延迟。→ 节点执行通常数秒到数分钟，可忽略。
- **轮询间隔**: 5s 轮询 `get_status` 比 SSE 推送延迟稍高。→ 节点执行本身需要数秒以上，5s 间隔足够。

## Migration Plan

代码已实现（本轮修复中直接提交），opsx 流程为补录归档。无额外部署步骤。

## Open Questions

无。
