## MODIFIED Requirements

### Requirement: 输入语音按钮 SHALL 从快捷按钮行移至输入框行内

文字版"语音输入"按钮从 `.quick-btns` 中删除，在 `.inputbar-row` 的输入框与发送按钮之间插入圆形 mic 小按钮（SVG 简笔线条图标），点击触发 `handleVoice`。

#### Scenario: 语音按钮迁移布局
- **WHEN** ScreenChat 渲染
- **THEN** `.quick-btns` 中 SHALL 不包含"语音输入"文字按钮
- **AND** `.inputbar-row` 中 input 与 ↑ 之间 SHALL 有一个圆形 mic 按钮
- **AND** mic 按钮 SHALL：宽高 38px、圆形、背景透明（hover 时浅灰）、SVG path 简笔 mic 线条、图标色 `var(--muted)`
- **AND** 点击 mic 按钮 SHALL 触发语音识别（与原先文字按钮行为一致）

## ADDED Requirements

### Requirement: ChatBubble 的"生成方案"按钮 SHALL 携带 messageId 回调

`ChatBubble` 组件的 `onGeneratePlan` 回调签名 SHALL 为 `(messageId: string) => void`，点击按钮时将当前消息的 `id` 作为参数传递。

#### Scenario: 点击生成方案按钮触发带 messageId 的回调
- **WHEN** 用户点击 `message.canGeneratePlan` 为 true 的 AI 消息中的"生成方案"按钮
- **THEN** `onGeneratePlan` SHALL 被调用
- **AND** 参数 SHALL 为该消息的 `id`

### Requirement: ScreenChat 根据 messageId 提取 brandInput 和 content 并传递

`ScreenChat` 的 `handleGeneratePlan` 函数 SHALL 根据接收到的 messageId 在 `messages` 数组中查找对应消息，提取其 `brandInput` 和 `content`，并通过 `onNavigate` 传递给 `MobileWorkbenchPage`。

#### Scenario: 找到消息时传递数据
- **GIVEN** `messages` 中存在 id 为 `'msg-1'` 的消息，其 `brandInput` = `{ brand_name: "可口可乐", ... }`，`content` = "我是可口可乐..."
- **WHEN** 用户点击该消息的"生成方案"按钮
- **THEN** `onNavigate('brief', content, brandInput)` SHALL 被调用
- **AND** MobileWorkbenchPage SHALL 暂存该数据并传递给 ScreenBrief

#### Scenario: 消息不存在时退化到纯跳转
- **WHEN** `handleGeneratePlan` 在 `messages` 中找不到对应的 messageId
- **THEN** `onNavigate('brief')` SHALL 被调用（不携带数据）
- **AND** ScreenBrief SHALL 使用默认 mock 数据
