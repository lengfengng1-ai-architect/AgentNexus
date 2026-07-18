## MODIFIED Requirements

### Requirement: 移动端聚焦态 chips SHALL 展示独立示例消息集（不复用药丸推荐项）

移动端聊天输入框聚焦且输入为空时，`focus-chips` SHALL 展示独立的"示例开场白"消息集，不复用未聚焦态药丸（`sg-scroll`）的 `displayPrompts`。每条 chip SHALL 携带 payload，点击后通过 `sendMessage(payload)` 走意图识别路由，而不是把 label 填入输入框。

#### Scenario: 聚焦态 chips 内容独立于药丸
- **GIVEN** 用户未发送任何消息且聚焦输入框、输入为空
- **WHEN** 渲染 `focus-chips`
- **THEN** chips SHALL 展示 `FOCUS_CHIP_EXAMPLES`（4 条示例消息）
- **AND** SHALL NOT 展示药丸的 `displayPrompts`（推荐方案生成 / 预算评估 / 创建盟域 等）

#### Scenario: chip 点击发送示例消息
- **GIVEN** 用户在聚焦态点击某条 chip
- **WHEN** chip 被点击
- **THEN** SHALL 调用 `sendMessage(payload)` 发送该 chip 的 payload
- **AND** 后端意图识别 SHALL 按消息内容路由（market_research / text_to_image / text_to_video / query_data）

#### Scenario: 4 条 chip 覆盖 4 类意图且与药丸零重叠
- **GIVEN** 聚焦态 chips 渲染
- **WHEN** 列出 4 条 chip
- **THEN** SHALL 包含覆盖 market_research / text_to_image / text_to_video / query_data 四类意图的示例消息
- **AND** 4 条 chip 的 payload SHALL 与药丸 `displayPrompts` 的任何 payload 不重复
- **AND** 其中一条 SHALL 为 query_data（数据查询），该能力在药丸中不存在

#### Scenario: chip 图标复用现有描边集且各异
- **GIVEN** 聚焦态 chips 渲染
- **THEN** 4 条 chip SHALL 复用现有 `FOCUS_CHIP_ICONS` 描边图标
- **AND** 4 条图标 SHALL 各不相同（柱状图 / 图片 / 胶片 / 地球）

#### Scenario: 未聚焦药丸行为不变
- **GIVEN** 用户未发送消息且未聚焦输入框
- **WHEN** 渲染空态
- **THEN** `sg-scroll` 药丸 SHALL 仍展示 `displayPrompts`（推荐方案生成 + 能力胶囊 + 换一批）
- **AND** 药丸点击行为 SHALL 不变（直达路由 `handlePromptClick`）
