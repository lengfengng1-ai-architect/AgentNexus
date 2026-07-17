---
capability: mobile-chat-session
name: 移动端对话会话
description: 移动端工作台①对话屏的对话会话能力，包含语音输入、快速按钮、消息发送与文件上传
---

## Purpose

提供移动端工作台①对话屏的核心交互能力：用户通过文本或语音输入消息、上传文件、选择快速填充模板，Agent 回复消息并通过 ChatBubble 渲染。

## Requirements

### Requirement: 移动端输入框支持文字输入与发送

系统 SHALL 在 ① 对话屏底部提供输入框、发送按钮，用户可输入文字并通过点击发送或按 Enter 发送消息。

#### Scenario: 用户发送一条文字消息
- **WHEN** 用户在输入框输入文本并点击发送按钮（或按 Enter）
- **THEN** 对话流 SHALL 追加一条用户消息气泡
- **AND** 输入框 SHALL 清空
- **AND** 系统 SHALL 发送消息到后端

### Requirement: 快捷按钮行提供可横向滚动的工具栏入口

系统 SHALL 在输入框上方提供可横向滚动的快捷按钮工具栏，当前按钮为「附件上传」「方案模版」「产品海报」「产品视频」「方案生成」，后续可继续增加。

#### Scenario: 工具栏按钮渲染和排序
- **WHEN** ① 对话屏渲染
- **THEN** 输入框上方 SHALL 显示一行可横向滚动的快捷按钮
- **AND** 按钮行 SHALL 可横向滚动（`overflow-x: auto`）

### Requirement: "方案模版"按钮填入完整模板到输入框

点击"方案模版"时，SHALL 将包含所有字段的模板填入输入框，模板包含品牌、品类、产品线、目标人群、城市、预算、周期等占位参数。

#### Scenario: 点击方案模版填入完整模板
- **WHEN** 用户点击"方案模版"按钮
- **THEN** 输入框 SHALL 填入：`我是 [品牌名]，属于 [品类]，产品线是 [产品线]，目标人群 [目标人群]，想在 [城市] 做活动，预算 [金额] 万，周期 [时长] 个月`

### Requirement: "方案生成"按钮 SHALL 纯跳转到②简报屏

点击"方案生成"时，SHALL 仅切换到②简报屏，不传递任何填充数据。

#### Scenario: 点击方案生成纯跳转
- **WHEN** 用户点击"方案生成"按钮
- **THEN** SHALL 调用 `onNavigate('brief')`
- **AND** SHALL 不传递 inputValue
- **AND** SHALL 不传递 brandData
- **AND** ScreenBrief SHALL 使用默认 mock 数据

### Requirement: "产品海报"按钮 SHALL 直接注入虚拟 AI 消息

点击"产品海报"时，SHALL 不再填入输入框模板，而是直接注入虚拟 AI 消息，在对话流中展开 InlineImageCard。

#### Scenario: 点击产品海报注入虚拟消息
- **WHEN** 用户点击"产品海报"按钮
- **THEN** 对话流 SHALL 追加一条用户消息，内容为 `"帮我生成一张产品海报图片"`
- **AND** 对话流 SHALL 追加一条 AI 消息，携带 intent `text_to_image` 和空的 generationPrompt
- **AND** 输入框 SHALL 保持不变（不被填充）
- **AND** ChatBubble SHALL 在 AI 消息气泡内渲染 InlineImageCard

### Requirement: "产品视频"按钮 SHALL 直接注入虚拟 AI 消息

点击"产品视频"时，SHALL 不再填入输入框模板，而是直接注入虚拟 AI 消息，在对话流中展开 InlineVideoCard。

#### Scenario: 点击产品视频注入虚拟消息
- **WHEN** 用户点击"产品视频"按钮
- **THEN** 对话流 SHALL 追加一条用户消息，内容为 `"帮我生成一条宣传视频"`
- **AND** 对话流 SHALL 追加一条 AI 消息，携带 intent `generate_video` 和空的 videoPrompt/imageUrls
- **AND** 输入框 SHALL 保持不变（不被填充）
- **AND** ChatBubble SHALL 在 AI 消息气泡内渲染 InlineVideoCard
- **AND** InlineVideoCard SHALL 显示 URL 输入框和视频描述输入框供用户补充

### Requirement: 输入语音按钮 SHALL 从快捷按钮行移至输入框行内

文字版"语音输入"按钮 SHALL 从 `.quick-btns` 中删除，在 `.inputbar-row` 的输入框与发送按钮之间插入圆形 mic 小按钮（SVG 简笔线条图标），点击触发 `handleVoice`。

#### Scenario: 语音按钮迁移布局
- **WHEN** ScreenChat 渲染
- **THEN** `.quick-btns` 中 SHALL 不包含"语音输入"文字按钮
- **AND** `.inputbar-row` 中 input 与 ↑ 之间 SHALL 有一个圆形 mic 按钮
- **AND** mic 按钮 SHALL：宽高 38px、圆形、背景透明（hover 时浅灰）、SVG path 简笔 mic 线条、图标色 `var(--muted)`
- **AND** 点击 mic 按钮 SHALL 触发语音识别（与原先文字按钮行为一致）

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
