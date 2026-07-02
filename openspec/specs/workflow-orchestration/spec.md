# Capability: workflow-orchestration

## Purpose

为 AllyGo 营销方案 Agent 提供可配置的 LangGraph 工作流编排底座，使各 Agent 节点能够独立开发、注册，并按 YAML 配置组合成完整工作流。

## Requirements

### Requirement: Agent 节点可以通过注册表接入底座

系统 SHALL 提供一个 Agent 注册表，允许 Agent 节点按名称注册异步入口函数 `run_<name>(state: dict)`。

#### Scenario: 注册并查询 Agent
- **WHEN** 调用 `registry.register("market_research", run_market_research)`
- **THEN** 系统 SHALL 保存该 Agent
- **AND** 调用 `registry.get_handler("market_research")` SHALL 返回同一 handler

### Requirement: 工作流可以通过 YAML 文件定义

系统 SHALL 从 `backend/workflows/*.yaml` 加载工作流定义，每个定义包含工作流 ID、名称、版本、节点列表和边列表。

#### Scenario: 加载有效工作流 YAML
- **WHEN** 系统启动时 `backend/workflows/` 下存在有效 YAML 文件
- **THEN** 系统 SHALL 成功解析并校验该工作流
- **AND** 通过 `list_workflows()` 可以查询到该工作流摘要

#### Scenario: 工作流引用未注册 Agent 时校验失败
- **WHEN** YAML 中某节点的 `agent` 未在注册表中注册
- **THEN** 系统 SHALL 抛出 `ValueError` 并提示未注册的 Agent 名称

#### Scenario: plan_generation_pipeline 被正确加载
- **WHEN** 系统启动时 `backend/workflows/plan_generation_pipeline.yaml` 存在且有效
- **THEN** 系统 SHALL 成功解析并校验该工作流
- **AND** 通过 `list_workflows()` 可以查询到该工作流摘要

### Requirement: 工作流节点之间可以通过输入映射传递数据

系统 SHALL 支持在 YAML 节点中使用简化 JSONPath 映射（`$.input.xxx`、`$.outputs.node_id.xxx`、`$.state.xxx`）作为 Agent handler 的输入。`$.state`  SHALL 同时包含 `input`、`outputs` 和 `status`，供 condition 表达式引用。

#### Scenario: 后序节点使用 state 中的完整上下文
- **GIVEN** 工作流包含节点 `intent` 和 `enrich`
- **AND** `enrich` 的 `input_mapping` 为 `{"intent": "$.state.outputs.intent.intent"}`
- **WHEN** 运行该工作流
- **THEN** `enrich` handler 接收的 state 中 `intent` SHALL 等于 `intent` 节点输出中的 `intent`

#### Scenario: reply_builder 读取多个上游节点输出
- **GIVEN** 工作流包含节点 `intent`、`extract`、`reply_builder`
- **AND** `reply_builder` 的 `input_mapping` 为 `{"intent": "$.outputs.intent", "branch_output": "$.outputs.extract", "message": "$.input.message"}`
- **WHEN** 运行该工作流
- **THEN** `reply_builder` handler 接收的 state 中 SHALL 包含 `intent`、`branch_output` 和 `message`

#### Scenario: plan_generator 读取多个上游节点输出
- **GIVEN** 工作流包含节点 `market_research`、`audience_insight`、`data_query`、`fitness_analysis`、`strategy_generation`、`execution_planning`、`budget_kpi`
- **AND** `plan_generator` 的 `input_mapping` 为 `{"market_research": "$.outputs.market_research", "audience_insight": "$.outputs.audience_insight", "data_query": "$.outputs.data_query", "fitness_analysis": "$.outputs.fitness_analysis", "strategy": "$.outputs.strategy_generation", "execution": "$.outputs.execution_planning", "budget_kpi": "$.outputs.budget_kpi"}`
- **WHEN** 运行该工作流
- **THEN** `plan_generator` handler 接收的 state 中 SHALL 包含所有上游节点输出

### Requirement: 工作流可以按拓扑顺序串行执行

系统 SHALL 根据 YAML 中的边构建有向无环图，按拓扑排序串行执行每个节点。当节点带有 `condition` 时，系统 SHALL 构建条件边，只执行满足条件的分支；不满足条件的分支 SHALL 被跳过，并在日志中记录。

#### Scenario: 条件边路由到正确分支
- **GIVEN** 工作流包含节点 `intent`、条件节点 `extract` 和 `data_query`
- **AND** `extract` 的 `condition` 为 `$.outputs.intent.intent == 'generate_plan'`
- **AND** `data_query` 的 `condition` 为 `$.outputs.intent.intent == 'query_data'`
- **WHEN** 输入 `{ "message": "查询上海数据" }`
- **THEN** 系统 SHALL 只执行 `data_query` 节点
- **AND** `outputs` 中 SHALL 不包含 `extract` 的输出
- **AND** 日志 SHALL 记录 `extract` 因条件不满足被跳过

#### Scenario: reply_builder 作为统一收口执行
- **GIVEN** 工作流包含节点 `intent`、`end_reply`、`reply_builder`
- **AND** `end_reply` 的 `condition` 为 `$.outputs.intent.intent in ['chat', 'clarify', 'update_context']`
- **AND** `reply_builder` 依赖 `end_reply`
- **WHEN** 输入 `{ "message": "你好" }`
- **THEN** 系统 SHALL 执行 `intent`、`end_reply` 和 `reply_builder`
- **AND** `outputs` 中 SHALL 包含 `reply_builder.reply`

#### Scenario: 工作流存在环时执行失败
- **GIVEN** 工作流节点和边构成环
- **WHEN** 系统加载或运行该工作流
- **THEN** 系统 SHALL 返回 HTTP 400
- **AND** 错误信息 SHALL 提示工作流包含循环

### Requirement: 对外暴露工作流运行 API

系统 SHALL 暴露 `GET /api/v1/workflows`、`GET /api/v1/workflows/{workflow_id}`、`POST /api/v1/workflows/{workflow_id}/run` 三个端点。

#### Scenario: 列出工作流
- **WHEN** 调用 `GET /api/v1/workflows`
- **THEN** 系统 SHALL 返回 HTTP 200
- **AND** 响应 SHALL 包含工作流摘要列表

#### Scenario: 运行不存在的工作流
- **WHEN** 调用 `POST /api/v1/workflows/missing/run`
- **THEN** 系统 SHALL 返回 HTTP 404
- **AND** 错误码 SHALL 为 `not_found`

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

#### Scenario: 节点带有简单 condition
- **GIVEN** 节点 `extract` 的 `condition` 为 `$.outputs.intent.intent == 'generate_plan'`
- **WHEN** `intent` 节点输出 `intent` 为 `generate_plan`
- **THEN** `extract` 节点 SHALL 被执行

#### Scenario: 节点 condition 不满足时被跳过
- **GIVEN** 节点 `extract` 的 `condition` 为 `$.outputs.intent.intent == 'generate_plan'`
- **WHEN** `intent` 节点输出 `intent` 为 `query_data`
- **THEN** `extract` 节点 SHALL 不被执行
- **AND** 系统日志 SHALL 记录跳过原因

#### Scenario: condition 使用 in 操作
- **GIVEN** 节点 `end_reply` 的 `condition` 为 `$.outputs.intent.intent in ['chat', 'clarify', 'update_context']`
- **WHEN** `intent` 节点输出 `intent` 为 `clarify`
- **THEN** `end_reply` 节点 SHALL 被执行

#### Scenario: plan_generation_pipeline 节点无需 condition
- **GIVEN** `plan_generation_pipeline` 所有节点均无条件执行
- **WHEN** 运行该工作流
- **THEN** 所有节点 SHALL 按拓扑顺序串行执行

### Requirement: 条件表达式解析错误返回 400

系统 SHALL 在加载或运行工作流时校验 `condition` 表达式。如果表达式语法不支持或引用的字段不存在，系统 SHALL 抛出 `ValueError`，最终由 API 返回 HTTP 400。

#### Scenario: 不支持的 condition 操作符
- **GIVEN** 节点 `extract` 的 `condition` 为 `$.outputs.intent.intent ~= 'generate_plan'`
- **WHEN** 系统加载该工作流
- **THEN** 系统 SHALL 抛出 `ValueError`
- **AND** 错误信息 SHALL 提示不支持的操作符

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
