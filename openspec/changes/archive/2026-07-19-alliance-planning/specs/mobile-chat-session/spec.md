## MODIFIED Requirements

### Requirement: 创建盟域药丸 SHALL 发送种子消息触发多轮流

移动端药丸"创建盟域"SHALL 从原 send-text 全量触发改为发送种子消息"帮我创建一个盟域"，触发 alliance_planning 多轮流。

#### Scenario: 点击药丸发送种子消息
- **GIVEN** 用户点击创建盟域药丸
- **WHEN** 触发
- **THEN** SHALL sendMessage("帮我创建一个盟域")

## ADDED Requirements

### Requirement: ChatBubble SHALL 渲染盟域规划入口卡

当消息携带 alliance_planning_id 时，ChatBubble SHALL 渲染 AlliancePlanningEntryCard（盟域摘要 + 建议 + 按钮）。

#### Scenario: 盟域规划完成显示入口卡
- **GIVEN** 消息携带 alliance_planning_id 且为移动端
- **THEN** SHALL 渲染 AlliancePlanningEntryCard
- **AND** 点击按钮 SHALL 打开 ScreenAlliancePlanning 覆盖屏
