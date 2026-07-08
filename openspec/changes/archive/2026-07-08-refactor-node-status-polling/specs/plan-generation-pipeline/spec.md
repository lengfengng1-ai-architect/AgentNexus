## ADDED Requirements

### Requirement: 节点状态持久化
系统 SHALL 将流水线每个节点的状态（running / complete / failed）持久化到 `plan_node_status` 表中。

#### Scenario: 节点执行写入状态
- **WHEN** 节点开始执行
- **THEN** 后端在 `plan_node_status` 表中将该节点状态设为 `running`
- **AND** 节点执行完成后状态更新为 `complete`（成功）或 `failed`（异常）

#### Scenario: 刷新页面恢复节点状态
- **WHEN** 用户刷新页面，前端恢复运行状态
- **THEN** 前端通过 `GET /plan/runs/{run_id}/status` 获取 `outputs.node_statuses`
- **AND** 用 DB 表中的节点状态恢复 PipelineTimeline 显示

### Requirement: 前端轮询同步节点状态
系统 SHALL 在流水线执行期间通过前端轮询 `get_status`（每 5s）保持节点状态同步。

#### Scenario: 轮询更新节点显示
- **WHEN** 流水线在执行中（promo_video 或 poster 未完成）
- **THEN** 前端每 5s 调用 `get_status` 获取 `node_statuses`
- **AND** 通过 `SYNC_NODE_STATUSES` action 逐个节点更新，不触发全量 RESTORE_STATUS

## MODIFIED Requirements

### Requirement: SSE 事件覆盖范围
此前 SSE `node.start/node.complete` 事件同时驱动节点状态和节点日志。

**更新**: SSE 不再驱动节点状态，仅保留 `workflow.paused`、`workflow.complete`、`chapter`、`node.log` 事件。节点状态改为后端写表 + 前端轮询。
