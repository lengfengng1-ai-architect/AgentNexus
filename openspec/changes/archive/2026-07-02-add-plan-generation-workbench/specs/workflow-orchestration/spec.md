## MODIFIED Requirements

### Requirement: 工作流可以通过 YAML 文件定义

系统 SHALL 从 `backend/workflows/*.yaml` 加载工作流定义，每个定义包含工作流 ID、名称、版本、节点列表和边列表。

#### Scenario: plan_generation_pipeline 被正确加载
- **WHEN** 系统启动时 `backend/workflows/plan_generation_pipeline.yaml` 存在且有效
- **THEN** 系统 SHALL 成功解析并校验该工作流
- **AND** 通过 `list_workflows()` 可以查询到该工作流摘要

### Requirement: 工作流节点之间可以通过输入映射传递数据

系统 SHALL 支持在 YAML 节点中使用简化 JSONPath 映射（`$.input.xxx`、`$.outputs.node_id.xxx`、`$.state.xxx`）作为 Agent handler 的输入。`$.state`  SHALL 同时包含 `input`、`outputs` 和 `status`，供 condition 表达式引用。

#### Scenario: plan_generator 读取多个上游节点输出
- **GIVEN** 工作流包含节点 `market_research`、`audience_insight`、`data_query`、`fitness_analysis`、`strategy_generation`、`execution_planning`、`budget_kpi`
- **AND** `plan_generator` 的 `input_mapping` 为 `{"market_research": "$.outputs.market_research", "audience_insight": "$.outputs.audience_insight", "data_query": "$.outputs.data_query", "fitness_analysis": "$.outputs.fitness_analysis", "strategy": "$.outputs.strategy_generation", "execution": "$.outputs.execution_planning", "budget_kpi": "$.outputs.budget_kpi"}`
- **WHEN** 运行该工作流
- **THEN** `plan_generator` handler 接收的 state 中 SHALL 包含所有上游节点输出

### Requirement: 对外暴露工作流运行 API

系统 SHALL 暴露 `GET /api/v1/workflows`、`GET /api/v1/workflows/{workflow_id}`、`POST /api/v1/workflows/{workflow_id}/run` 三个端点。

#### Scenario: 同步运行工作流
- **WHEN** 调用 `POST /api/v1/workflows/{workflow_id}/run`
- **THEN** 系统 SHALL 返回同步 JSON 响应
- **AND** 响应格式与现有接口保持一致

#### Scenario: SSE 流式运行工作流
- **WHEN** 调用 `POST /api/v1/workflows/{workflow_id}/run?stream=true`
- **THEN** 系统 SHALL 返回 `text/event-stream`
- **AND** 通过 SSE 推送节点执行状态

### Requirement: 工作流节点支持 condition 字段

系统 SHALL 允许 `WorkflowNode` 包含可选的 `condition` 字段，使用 JSONPath 布尔表达式描述该节点是否应该执行。condition 表达式 SHALL 支持 `==` 和 `in` 两种比较操作，以及 `and` / `or` 逻辑组合。

#### Scenario: plan_generation_pipeline 节点无需 condition
- **GIVEN** `plan_generation_pipeline` 所有节点均无条件执行
- **WHEN** 运行该工作流
- **THEN** 所有节点 SHALL 按拓扑顺序串行执行

## ADDED Requirements

### Requirement: 系统 SHALL 提供工作流运行控制接口

系统 SHALL 暴露 `POST /api/v1/workflows/runs/{run_id}/control`，允许用户在工作流阻塞时控制流程继续。

#### Scenario: 重试失败节点
- **GIVEN** 工作流因某节点失败处于阻塞状态
- **WHEN** 调用 `POST /api/v1/workflows/runs/{run_id}/control` 请求体 `{"action":"retry","node_id":"<node_id>"}`
- **THEN** 系统 SHALL 重新执行指定节点
- **AND** 已完成的节点结果 SHALL 复用

#### Scenario: 跳过失败节点
- **GIVEN** 工作流因某节点失败处于阻塞状态
- **WHEN** 调用 `POST /api/v1/workflows/runs/{run_id}/control` 请求体 `{"action":"skip","node_id":"<node_id>"}`
- **THEN** 系统 SHALL 使用默认值继续执行下游节点

#### Scenario: 终止工作流
- **GIVEN** 工作流处于阻塞状态
- **WHEN** 调用 `POST /api/v1/workflows/runs/{run_id}/control` 请求体 `{"action":"abort"}`
- **THEN** 系统 SHALL 结束工作流并返回失败状态

### Requirement: 系统 SHALL 支持工作流运行状态查询

系统 SHALL 暴露 `GET /api/v1/workflows/runs/{run_id}/status`，返回指定运行实例的当前状态、已完成节点输出、失败节点信息。

#### Scenario: 查询运行状态
- **WHEN** 调用 `GET /api/v1/workflows/runs/{run_id}/status`
- **THEN** 系统 SHALL 返回 `run_id`、`workflow_id`、`status`、`outputs`、`failed_node`（如有）
