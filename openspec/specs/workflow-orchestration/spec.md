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

### Requirement: 工作流可以按拓扑顺序串行或并行执行

系统 SHALL 根据 YAML 中的边构建有向无环图。支持两类执行：
1. **串行**：一个节点完成后执行下一个节点（现有行为）
2. **并行 fan-out**：一个节点完成后同时触发多个下游节点
3. **并行 fan-in**：一个节点声明 `depends_on` 后，等所有上游节点完成才执行

无 `depends_on` 的节点在入口处同时并行执行。

#### Scenario: 三个调研节点并行执行
- **GIVEN** 工作流包含节点 `product_research`、`market_analysis`、`audience_search`
- **AND** 三者均无 `depends_on` 且从同一入口开始
- **WHEN** 运行该工作流
- **THEN** 三个节点 SHALL 并发执行
- **AND** 总执行时间约等于最慢的单个节点

#### Scenario: fan-in 节点等待所有上游完成
- **GIVEN** 工作流包含节点 `product_research`、`market_analysis`、`audience_search` 和 `generate_persona`
- **AND** `generate_persona` 的 `depends_on` 为 `[product_research, market_analysis, audience_search]`
- **WHEN** 运行该工作流
- **THEN** `generate_persona` SHALL 在三个上游节点全部完成后才执行

#### Scenario: 工作流存在环时执行失败
- **GIVEN** 工作流节点和边构成环
- **WHEN** 系统加载或运行该工作流
- **THEN** 系统 SHALL 返回 HTTP 400
- **AND** 错误信息 SHALL 提示工作流包含循环

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

### Requirement: 条件表达式解析错误返回 400

系统 SHALL 在加载或运行工作流时校验 `condition` 表达式。如果表达式语法不支持或引用的字段不存在，系统 SHALL 抛出 `ValueError`，最终由 API 返回 HTTP 400。

#### Scenario: 不支持的 condition 操作符
- **GIVEN** 节点 `extract` 的 `condition` 为 `$.outputs.intent.intent ~= 'generate_plan'`
- **WHEN** 系统加载该工作流
- **THEN** 系统 SHALL 抛出 `ValueError`
- **AND** 错误信息 SHALL 提示不支持的操作符

