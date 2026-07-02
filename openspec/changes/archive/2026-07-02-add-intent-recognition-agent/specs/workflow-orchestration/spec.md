## MODIFIED Requirements

### Requirement: 工作流节点之间可以通过输入映射传递数据

系统 SHALL 支持在 YAML 节点中使用简化 JSONPath 映射（`$.input.xxx`、`$.outputs.node_id.xxx`、`$.state.xxx`）作为 Agent handler 的输入。`$.state`  SHALL 同时包含 `input`、`outputs` 和 `status`，供 condition 表达式引用。

#### Scenario: 后序节点使用 state 中的完整上下文
- **GIVEN** 工作流包含节点 `intent` 和 `enrich`
- **AND** `enrich` 的 `input_mapping` 为 `{"intent": "$.state.outputs.intent.intent"}`
- **WHEN** 运行该工作流
- **THEN** `enrich` handler 接收的 state 中 `intent` SHALL 等于 `intent` 节点输出中的 `intent`

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

#### Scenario: 工作流存在环时执行失败
- **GIVEN** 工作流节点和边构成环
- **WHEN** 系统加载或运行该工作流
- **THEN** 系统 SHALL 返回 HTTP 400
- **AND** 错误信息 SHALL 提示工作流包含循环

## ADDED Requirements

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
