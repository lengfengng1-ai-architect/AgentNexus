## MODIFIED Requirements

### Requirement: 预算评估药丸 SHALL 发送种子消息触发多轮预算评估

移动端药丸"预算评估"SHALL 从原来的"填模板到输入框"改为发送种子消息（send-text），触发意图识别的 budget_assessment 多轮流。其他药丸行为本次不改。

#### Scenario: 点击预算评估药丸发送种子消息
- **GIVEN** 用户点击预算评估药丸
- **WHEN** 触发 handlePromptClick
- **THEN** SHALL 调用 sendMessage 发送预算评估种子消息
- **AND** SHALL NOT 填模板到输入框

## ADDED Requirements

### Requirement: ChatBubble SHALL 渲染预算评估入口卡

当消息携带 budget_assessment_id 时，ChatBubble SHALL 渲染 BudgetAssessmentEntryCard（迷你条形图 + KPI + 一句话建议 + 查看按钮），与现有的调研结果入口卡模式一致。

#### Scenario: 预算评估完成显示入口卡
- **GIVEN** 消息携带 budget_assessment_id 且为移动端
- **WHEN** ChatBubble 渲染
- **THEN** SHALL 渲染 BudgetAssessmentEntryCard
- **AND** 点击查看按钮 SHALL 打开 ScreenBudgetAssessment 覆盖屏
