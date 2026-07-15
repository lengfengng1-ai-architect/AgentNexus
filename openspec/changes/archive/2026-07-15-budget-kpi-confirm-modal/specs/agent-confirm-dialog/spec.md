## ADDED Requirements

### Requirement: budget_kpi 节点暂停时展示计算结果

当 workflow 因 interrupt_after 暂停在 budget_kpi 节点时，前端 SHALL 展示该节点的计算结果（预算分配、KPI 指标、里程碑），而非通用"即将执行"文案。

#### Scenario: budget_kpi 弹窗展示结果
- **GIVEN** 前端收到 `workflow.paused` 事件且 `snapshot.node_id === "budget_kpi"`
- **WHEN** 确认弹窗弹出
- **THEN** 弹窗 SHALL 展示 `snapshot.upstream_outputs.budget_kpi` 中的 `total_budget`、`period_months`、`allocations[]`、`kpis{}`、`timeline[]`
- **AND** 弹窗容器 SHALL 使用 `max-height: 70vh` + `overflow-y: auto`，内容较多时可滚动

### Requirement: 其他节点暂停时保持通用弹窗

非 budget_kpi 节点暂停时（如 execution_planning、action_recommendations 等），前端 SHALL 使用现有通用弹窗样式，不展示节点计算结果。

#### Scenario: execution_planning 暂停弹通用弹窗
- **GIVEN** 前端收到 `workflow.paused` 事件且 `snapshot.node_id === "execution_planning"`
- **WHEN** 确认弹窗弹出
- **THEN** 弹窗 SHALL 使用现有通用样式，仅显示"即将执行"和节点名称
- **AND** SHALL 不展示任何节点计算结果
