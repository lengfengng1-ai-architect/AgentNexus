## MODIFIED Requirements

### Requirement: 流水线 SHALL 在确认节点前中断(interrupt_before)并在 budget_kpi 后中断(interrupt_after)

系统 SHALL 在编译流水线时声明 `interrupt_before=["plan_data_query","fitness_analysis","strategy_generation","execution_planning","action_recommendations","plan_generator"]` 和 `interrupt_after=["budget_kpi"]`。budget_kpi 执行完成后暂停，其他节点执行前暂停。workflow.paused 的 snapshot.node_id SHALL 标识实际暂停的节点。

当执行到审核点时，LangGraph SHALL 自动中断并落盘 checkpoint。系统 SHALL 在 SSE 流末尾 emit `workflow.paused` 事件，data 包含 `run_id`、`snapshot` (当前 state values)、`reason`（`"review"` 或 `"failure"`）。

#### Scenario: budget_kpi 执行后触发 pause
- **GIVEN** 流水线已执行完 budget_kpi 节点
- **WHEN** LangGraph 触发 interrupt_after
- **THEN** SSE 流 SHALL emit `workflow.paused`，data 中 `snapshot.node_id` SHALL 为 `"budget_kpi"`
- **AND** data 中 `snapshot.upstream_outputs.budget_kpi` SHALL 包含 budget_kpi 节点的完整输出

#### Scenario: 其他节点（如 execution_planning）仍在执行前暂停
- **GIVEN** 流水线执行到 execution_planning 前
- **WHEN** LangGraph 触发 interrupt_before
- **THEN** SSE 流 SHALL emit `workflow.paused`，`snapshot.node_id` SHALL 为 `"execution_planning"`
- **AND** `snapshot.upstream_outputs.budget_kpi` 此时为空

#### Scenario: 首次 pause 在 execution_planning（budget_kpi 前一个节点）
- **GIVEN** 一个新 run 已完成 strategy_generation
- **WHEN** 流水线到达 execution_planning 节点前
- **THEN** SSE 流 SHALL emit `workflow.paused`，`snapshot.node_id` SHALL 为 `"execution_planning"`

### Requirement: 驳回重跑 budget_kpi 时清空下游节点输出

驳回 budget_kpi 时，系统 SHALL 清空 budget_kpi 及其下游节点（action_recommendations、plan_generator）的输出，并将用户的驳回原因注入 brand_input，然后回退 state 重新执行 budget_kpi。

#### Scenario: 驳回 budget_kpi 重新执行
- **GIVEN** workflow 已 pause 在 budget_kpi（interrupt_after）
- **WHEN** 用户调用 `POST /plan/runs/{run_id}/reject` 请求体 `{"reason": "减少赛事投入，增加达人合作"}`
- **THEN** 系统 SHALL 清空 channel_values 中的 `budget_kpi`、`action_recommendations`、`plan_generator`
- **AND** 系统 SHALL 注入 `brand_input._reject_reason = "减少赛事投入，增加达人合作"`
- **AND** 系统 SHALL 回退 state 使 budget_kpi 节点重新执行
- **AND** SSE 流 SHALL 重新推送 budget_kpi 相关事件

#### Scenario: 驳回原因传递给 LLM prompt
- **GIVEN** budget_kpi 节点因驳回重跑而重新执行
- **WHEN** budget_kpi agent 读取到 `_reject_reason` 
- **THEN** 该原因 SHALL 出现在 LLM prompt 的"用户补充要求"区域
- **AND** LLM SHALL 根据新要求调整预算分配和 KPI

### Requirement: 驳回重跑过程 SHALL 记录后端日志

系统 SHALL 在驳回重跑 budget_kpi 时输出后端日志，包含用户输入的具体原因。

#### Scenario: 驳回时记录日志
- **GIVEN** 用户驳回 budget_kpi 节点
- **WHEN** `reject_run` 函数处理驳回请求
- **THEN** 系统 SHALL 调用 `logger.info("[plan] 用户驳回 budget_kpi，原因：%s", reason)`

#### Scenario: rejct reason 在 agent 日志中体现
- **GIVEN** budget_kpi 节点因驳回重跑执行
- **WHEN** `run_budget_kpi` 读取到 `_reject_reason`
- **THEN** agent SHALL 调用 `write_log("budget_kpi", "📝 用户补充要求：{reason}")`
