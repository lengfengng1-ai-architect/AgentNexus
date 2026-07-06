## Purpose

定义方案生成 pipeline 中每个 agent 执行完成后的用户确认机制，包括确认继续、重新执行和自动执行模式。

## Requirements

### Requirement: 每个 agent 执行完成后暂停等待用户确认

串行 pipeline 中的所有 agent 节点执行完成后，系统 SHALL 自动暂停工作流，等待用户确认。全部 10 个 agent（product_research、market_research、audience_insight、plan_data_query、fitness_analysis、strategy_generation、execution_planning、budget_kpi、action_recommendations、plan_generator）执行后都 SHALL pause。

#### Scenario: 每个 agent 完成后触发 pause

- **GIVEN** 工作流正在串行执行 agent
- **WHEN** 当前 agent 执行完成且输出已写入 state
- **THEN** 系统 SHALL 暂停工作流并发送 `workflow.paused` SSE 事件

### Requirement: 确认继续

用户点击"确认继续"后，系统 SHALL 从当前 pause 节点恢复执行下一个 agent。

#### Scenario: 确认后继续执行

- **GIVEN** 工作流 pause 在某个 agent 执行完成后
- **WHEN** 用户点击"确认继续"
- **THEN** 系统 SHALL 调用 approve API 恢复工作流
- **AND** 下一个 agent SHALL 开始执行

### Requirement: 重新执行

用户点击"重新执行"后，系统 SHALL 清空当前 agent 的输出并重新执行该 agent。

#### Scenario: 重新执行当前 agent

- **GIVEN** 工作流 pause 在某个 agent 执行完成后
- **WHEN** 用户点击"重新执行"
- **THEN** 系统 SHALL 清空 state 中当前节点的输出
- **AND** 系统 SHALL 用相同 input 重新调用该 agent 的 handler
- **AND** 重新执行完成后再次暂停，等待用户确认

### Requirement: 前端确认对话框

前端 SHALL 在工作流 pause 时自动弹出确认对话框，展示当前 agent 的执行结果并提供"确认继续"和"重新执行"两个按钮。

#### Scenario: 自动弹出确认对话框

- **GIVEN** 前端收到 `workflow.paused` SSE 事件
- **WHEN** paused 事件触发
- **THEN** 前端 SHALL 自动弹出确认对话框
- **AND** 对话框 SHALL 展示该 agent 的名称和关键输出摘要
- **AND** 对话框 SHALL 包含"确认继续"按钮
- **AND** 对话框 SHALL 包含"重新执行"按钮
- **AND** 对话框 SHALL 包含"自动确认"切换按钮

#### Scenario: 用户点击已完成的 agent 重新打开确认框

- **GIVEN** PipelineTimeline 中有 agent 状态为 complete
- **WHEN** 用户点击该 agent
- **THEN** 前端 SHALL 弹出确认框展示该 agent 的输出结果

### Requirement: Tab 与 Agent 一一映射

系统 SHALL 将顶部 Tab 栏从方案章节结构改为 10 个 agent 映射，当前执行到的 agent 对应的 tab 高亮。

#### Scenario: Tab 高亮当前 agent

- **GIVEN** 工作流正在执行某个 agent
- **WHEN** 该 agent 的状态变为 running
- **THEN** 对应的 tab（概览: product_research, 市场研究: market_research, 人群洞察: audience_insight, 平台资源: plan_data_query, 适配度分析: fitness_analysis, 策略生成: strategy_generation, 执行规划: execution_planning, 预算KPI: budget_kpi, 行动建议: action_recommendations, 方案生成: plan_generator）SHALL 高亮

#### Scenario: 点击 tab 滚动到对应 agent

- **GIVEN** Tab 栏显示 10 个 tab
- **WHEN** 用户点击某个 tab
- **THEN** 页面 SHALL 滚动到 PipelineTimeline 中对应的 agent 行

### Requirement: 自动执行模式

系统 SHALL 在 header 右上角提供"自动执行"切换按钮，开启后所有 agent 执行完成时自动确认继续，不再弹出确认对话框。

#### Scenario: 开启自动执行

- **GIVEN** 工作流正在执行 agent 序列
- **WHEN** 用户点击 header 右上角的"自动执行"按钮
- **THEN** 按钮 SHALL 变为高亮状态显示"自动执行中"
- **AND** 之后每个 agent 执行完成时 SHALL 自动调用 approve API
- **AND** 确认对话框 SHALL 不再自动弹出
