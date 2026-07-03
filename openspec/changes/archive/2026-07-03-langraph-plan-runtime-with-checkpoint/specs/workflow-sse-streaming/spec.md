## REMOVED Requirements

### Requirement: 系统 SHALL 支持 SSE 方式运行工作流

**Reason**: 通用 `POST /api/v1/workflows/{workflow_id}/run?stream=true` 端点在 `2026-07-03-simplify-workflow-orchestration` 中已删除路由（`app/routers/workflows.py` 不存在）。SSE 契约在本次 change 中收敛到 plan-specific 端点 `POST /api/v1/plan/run`，参数不再需要 `?stream=true`（该端点始终流式返回）。

**Migration**: `POST /api/v1/workflows/plan_generation_pipeline/run?stream=true` → `POST /api/v1/plan/run`。同步模式不再暴露，非流式调用方通过消费 SSE 到 `workflow.complete` 事件取全量结果等价满足。

### Requirement: SSE 事件 SHALL 包含节点生命周期状态

**Reason**: 节点生命周期事件（`node.start` / `node.log` / `node.complete` / `node.failed` / `workflow.complete`）本身继续存在，但契约不再作为**通用 workflow SSE 协议**存在，而是收敛为 plan-specific 契约。因为本项目只剩 plan pipeline 一个 workflow，独立 capability 反而增加维护成本；把事件表并入 `plan-generation-pipeline` capability spec 更贴合实际使用。

**Migration**: 完整事件表移入 `plan-generation-pipeline` capability 的「SSE 协议」相关 requirement。字段语义保持兼容，前端解析代码不需要改事件类型判断，仅需按新 capability spec 补齐 `workflow.paused` / `chapter.start` / `chapter.complete` 三类新事件。

### Requirement: 系统 SHALL 提供工作流运行控制接口

**Reason**: 与 `workflow-orchestration` capability 同名 requirement 重复（`workflow-sse-streaming` 定义时把 control 端点也拉了进来）。本次一并移除，语义演化到 plan-specific `/api/v1/plan/runs/{run_id}/{approve,reject,cancel}` 端点。

**Migration**: 详见 `workflow-orchestration` capability 中同名 requirement 的 Migration 说明。

### Requirement: SSE 连接 SHALL 支持断线重连

**Reason**: 断线重连语义（`last_event_id` 续传）保留，但作为 plan-specific 契约的一部分并入 `plan-generation-pipeline` capability。checkpointer 落盘的 state 天然支持 GET `/plan/runs/{id}/status` 拉取当前进度，重连时前端读一次 status 即可对齐进度，不再依赖服务端 `last_event_id` 队列。

**Migration**: 前端 SSE 重连策略从「重发 SSE 请求 + `Last-Event-ID` 头」改为「先 `GET /plan/runs/{id}/status` 对齐 state，然后按需要 approve/reject 触发下一段 SSE 流」。

### Requirement: SSE 事件数据 SHALL 使用 JSON 格式

**Reason**: JSON `data` 字段约束继续存在，但作为通用 SSE 协议 requirement 冗余（新的 plan capability spec 里逐事件表格声明字段结构，已隐含 JSON 序列化）。

**Migration**: 契约合并到 `plan-generation-pipeline` capability 的事件表里，字段级 schema 更明确。
