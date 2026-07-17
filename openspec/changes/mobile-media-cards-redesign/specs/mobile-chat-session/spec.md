# Delta: mobile-chat-session（流式思考展示）

本 delta 为 `mobile-chat-session` 新增流式思考过程（reasoning）的展示要求。该能力此前未覆盖 reasoning 展示。

## ADDED Requirements

### Requirement: 流式思考过程 SHALL 以独立小卡展示且固定高度

移动端流式响应期间，AI 的思考过程 SHALL 渲染为气泡内的独立小卡（标题行 + 内容区）；内容区 SHALL 使用固定高度（非 max-height），内部滚动跟随最新内容，使流式过程中气泡总高度保持稳定、不撑开消息列表。思考过程 SHALL 仅在流式期间展示——INTENT 到达后小卡消失，不渲染到正式消息中，也不持久化。

#### Scenario: 流式思考中小卡展示
- **WHEN** 移动端接收到流式 reasoning 内容
- **THEN** 气泡内 SHALL 显示独立小卡，标题行为「💭 思考中…」
- **AND** 内容区 SHALL 为固定高度（约 96–120px），超出部分内部垂直滚动
- **AND** 内容区 SHALL 自动滚动到底部以跟随最新思考内容
- **AND** 消息列表整体高度 SHALL 不随思考内容增长而变化

#### Scenario: 无思考内容时回退
- **WHEN** 流式响应无 reasoning 内容
- **THEN** SHALL 显示既有打字指示器（TypingIndicator），不渲染思考小卡

#### Scenario: 流式结束后思考消失
- **WHEN** 流式响应结束（INTENT 到达、正式消息渲染）
- **THEN** 思考小卡 SHALL 不再显示
- **AND** 刷新页面后历史消息中 SHALL 不出现思考内容
