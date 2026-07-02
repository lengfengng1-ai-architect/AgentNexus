# Capability: workflow-sse-streaming

## Purpose

为 AllyGo 营销方案 Agent 的工作流运行 API 提供 SSE 流式状态推送能力，使前端能够实时观察 Agent 节点执行过程、日志、完成与失败状态，支撑 `/plan` 工作台的流水线可视化。

## Requirements

### Requirement: 系统 SHALL 支持 SSE 方式运行工作流

系统 SHALL 在现有同步 `POST /api/v1/workflows/{workflow_id}/run` 接口基础上，支持通过 `?stream=true` 参数以 SSE 流式返回工作流执行状态。

#### Scenario: 请求 SSE 流
- **WHEN** 调用 `POST /api/v1/workflows/chat_pipeline/run?stream=true`
- **THEN** 响应头 `Content-Type` SHALL 为 `text/event-stream`
- **AND** 响应体 SHALL 以 SSE 格式推送事件

#### Scenario: 同步接口保持兼容
- **WHEN** 调用 `POST /api/v1/workflows/chat_pipeline/run` 不带 `stream=true`
- **THEN** 系统 SHALL 继续返回同步 JSON 响应
- **AND** 响应格式与现有接口一致

### Requirement: SSE 事件 SHALL 包含节点生命周期状态

SSE 事件 SHALL 覆盖工作流开始、节点开始、节点日志、节点完成、节点失败、节点等待用户确认、工作流完成、工作流失败。

#### Scenario: 节点开始事件
- **WHEN** 某个 Agent 节点开始执行
- **THEN** 系统 SHALL 推送 `event: node.start`
- **AND** `data` SHALL 包含 `node_id` 和 `timestamp`

#### Scenario: 节点日志事件
- **WHEN** Agent 节点产生进度日志
- **THEN** 系统 SHALL 推送 `event: node.log`
- **AND** `data` SHALL 包含 `node_id`、`message`、`timestamp`

#### Scenario: 节点完成事件
- **WHEN** Agent 节点执行完成
- **THEN** 系统 SHALL 推送 `event: node.complete`
- **AND** `data` SHALL 包含 `node_id`、`output`、`duration_ms`

#### Scenario: 节点失败事件
- **WHEN** Agent 节点执行失败
- **THEN** 系统 SHALL 推送 `event: node.failed`
- **AND** `data` SHALL 包含 `node_id`、`error`、`timestamp`
- **AND** 后续不再自动推送新的节点事件，直到用户通过控制接口恢复

#### Scenario: 工作流完成事件
- **WHEN** 所有节点执行完成
- **THEN** 系统 SHALL 推送 `event: workflow.complete`
- **AND** `data` SHALL 包含完整 `outputs`

### Requirement: 系统 SHALL 提供工作流运行控制接口

当节点失败或用户关闭自动继续时，系统 SHALL 提供控制接口让用户选择重试、跳过或终止。

#### Scenario: 重试失败节点
- **GIVEN** `market_research` 节点失败且工作流处于阻塞状态
- **WHEN** 调用 `POST /api/v1/workflows/runs/{run_id}/control` 请求体 `{"action":"retry","node_id":"market_research"}`
- **THEN** 系统 SHALL 从 `market_research` 节点重新执行
- **AND** 已完成的节点结果 SHALL 从 state 复用

#### Scenario: 跳过失败节点
- **GIVEN** `audience_insight` 节点失败
- **WHEN** 调用 `POST /api/v1/workflows/runs/{run_id}/control` 请求体 `{"action":"skip","node_id":"audience_insight"}`
- **THEN** 系统 SHALL 使用默认值继续执行下游节点

#### Scenario: 终止工作流
- **GIVEN** 工作流处于阻塞状态
- **WHEN** 调用 `POST /api/v1/workflows/runs/{run_id}/control` 请求体 `{"action":"abort"}`
- **THEN** 系统 SHALL 结束工作流
- **AND** 推送 `event: workflow.failed`

### Requirement: SSE 连接 SHALL 支持断线重连

前端断开 SSE 连接后重新连接时，系统 SHALL 能够继续推送当前状态。

#### Scenario: 断线后重连
- **GIVEN** SSE 连接因网络原因断开
- **WHEN** 前端重新建立 SSE 连接并带上 `last_event_id`
- **THEN** 系统 SHALL 从上次事件之后继续推送
- **AND** 如果工作流已完成，立即推送 `workflow.complete` 或 `workflow.failed`

### Requirement: SSE 事件数据 SHALL 使用 JSON 格式

每个 SSE 事件的 `data` 字段 SHALL 为 JSON 字符串，便于前端解析。

#### Scenario: 解析 node.complete 事件
- **WHEN** 前端收到 `event: node.complete` 行
- **THEN** 下一行 `data:` 内容 SHALL 可解析为 JSON
- **AND** JSON SHALL 包含 `node_id`、`output`、`duration_ms`

## ADDED Requirements

## MODIFIED Requirements

## REMOVED Requirements

## RENAMED Requirements
