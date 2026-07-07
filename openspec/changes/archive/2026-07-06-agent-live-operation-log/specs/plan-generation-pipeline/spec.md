# Delta Spec: plan-generation-pipeline

## MODIFIED Requirements

### Requirement: SSE 协议 SHALL 遵循标准三行帧格式

系统所有 SSE 事件 SHALL 使用 `id: / event: / data:` 三行格式，每帧 `data` SHALL 为合法 JSON 字符串。`run_id` SHALL 同时冗余到响应头 `X-Run-Id` 和首帧 `workflow.start` 的 `data.run_id` 中。事件表：

| event | data 字段 |
|-------|-----------|
| `workflow.start` | `run_id` |
| `node.start` | `run_id, node_id, label` |
| `node.log` | `run_id, node_id, message` |
| `node.complete` | `run_id, node_id, output` |
| `node.failed` | `run_id, node_id, error` |
| `chapter.start` | `run_id, node_id="plan_generator", chapter_index, title` |
| `chapter.complete` | `run_id, node_id="plan_generator", chapter_index, title, subtitle, content` |
| `workflow.paused` | `run_id, awaiting_node, snapshot, reason` |
| `workflow.complete` | `run_id, outputs` |
| `workflow.cancelled` | `run_id` |

#### Scenario: 每帧包含单调递增的 id
- **WHEN** SSE 流推送第 N 个事件
- **THEN** 该帧 SHALL 以 `id: <N>` 开头（N 从 1 单调递增）
- **AND** 后续行 SHALL 为 `event: <类型>` 和 `data: <JSON>`
- **AND** 帧末 SHALL 有空行分隔

#### Scenario: workflow.start 首帧带 run_id
- **WHEN** 客户端建立新 SSE 连接（POST `/plan/run` 或 approve / reject）
- **THEN** 首帧 event SHALL 为 `workflow.start`
- **AND** data JSON SHALL 包含 `run_id`
- **AND** 响应头 SHALL 包含 `X-Run-Id: <run_id>`

#### Scenario: node.log 包含操作步骤消息
- **WHEN** Agent 节点调用 `dispatch_custom_event("log", {"node_id": "...", "message": "..."})`
- **THEN** SSE 流 SHALL 推送 `event: node.log`
- **AND** data SHALL 包含 `run_id`、`node_id`、`message`
- **AND** `message` SHALL 为 Agent 当前执行步骤的中文描述文本
