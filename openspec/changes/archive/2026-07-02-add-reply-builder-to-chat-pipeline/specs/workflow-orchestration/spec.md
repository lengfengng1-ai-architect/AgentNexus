## MODIFIED Requirements

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
