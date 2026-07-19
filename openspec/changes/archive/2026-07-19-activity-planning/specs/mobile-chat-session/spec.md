## MODIFIED Requirements

### Requirement: 创建活动药丸 SHALL 发送种子消息触发多轮活动规划

移动端药丸"创建活动"SHALL 从原 send-text 全量触发改为发送种子消息"帮我规划一个活动"，触发 activity_planning 多轮流。

#### Scenario: 点击药丸发送种子消息
- **GIVEN** 用户点击创建活动药丸
- **WHEN** 触发
- **THEN** SHALL sendMessage("帮我规划一个活动")

## ADDED Requirements

### Requirement: ChatBubble SHALL 渲染活动规划入口卡

当消息携带 activity_planning_id 时，ChatBubble SHALL 渲染 ActivityPlanningEntryCard（候选赛事摘要 + 建议 + 按钮），与预算评估入口卡模式一致。

#### Scenario: 活动规划完成显示入口卡
- **GIVEN** 消息携带 activity_planning_id 且为移动端
- **WHEN** ChatBubble 渲染
- **THEN** SHALL 渲染 ActivityPlanningEntryCard
- **AND** 点击按钮 SHALL 打开 ScreenActivityPlanning 覆盖屏
