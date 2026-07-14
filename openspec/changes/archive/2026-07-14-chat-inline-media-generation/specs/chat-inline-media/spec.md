---
capability: chat-inline-media
name: 对话入口内联图片/视频生成
description: 对话入口屏的「产品海报」「产品视频」快捷按钮直接注入虚拟 AI 消息，在对话流中展开 InlineImageCard / InlineVideoCard，支持原地配置参数、生成和展示结果。
---

## Purpose

消除当前「产品海报」「产品视频」按钮需要用户手动发送、后端可能误识别为 generate_plan 导致跳转到简报页的问题。通过在前端直接注入虚拟消息（指定正确 intent），借助已有的 InlineImageCard / InlineVideoCard 组件在对话流中原地展开生成参数面板。

## Requirements

### Requirement: 「产品海报」按钮 SHALL 直接注入虚拟 AI 消息

点击「产品海报」按钮时，SHALL 在前端本地构造一条 AI 消息，携带 text_to_image intent，无需向后端 SSE 发送请求。

#### Scenario: 点击产品海报按钮
- **WHEN** 用户点击 ScreenChat 中的「产品海报」按钮
- **THEN** 输入框 SHALL 不被填充（不修改 inputValue）
- **AND** 对话流 SHALL 追加一条用户消息，内容为 `"帮我生成一张产品海报图片"`
- **AND** 对话流 SHALL 追加一条 AI 消息，携带 intent `text_to_image` 和空的 generationPrompt
- **AND** ChatBubble SHALL 在 AI 消息气泡内渲染 InlineImageCard
- **AND** 页面 SHALL 不切换到 ② 简报屏

#### Scenario: 虚拟消息不持久化
- **WHEN** 页面刷新
- **THEN** 通过「产品海报」按钮生成的虚拟消息 SHALL 丢失
- **AND** 不影响 localStorage 中的对话历史

### Requirement: 「产品视频」按钮 SHALL 直接注入虚拟 AI 消息

点击「产品视频」按钮时，SHALL 在前端本地构造一条 AI 消息，携带 generate_video intent，无需向后端 SSE 发送请求。

#### Scenario: 点击产品视频按钮
- **WHEN** 用户点击 ScreenChat 中的「产品视频」按钮
- **THEN** 输入框 SHALL 不被填充（不修改 inputValue）
- **AND** 对话流 SHALL 追加一条用户消息，内容为 `"帮我生成一条宣传视频"`
- **AND** 对话流 SHALL 追加一条 AI 消息，携带 intent `generate_video` 和空的 videoPrompt/imageUrls
- **AND** ChatBubble SHALL 在该 AI 消息气泡内渲染 InlineVideoCard
- **AND** InlineVideoCard SHALL 显示 URL 输入框（imageUrls 为空时）和视频描述输入框（videoPrompt 为空时）
- **AND** 页面 SHALL 不切换到 ② 简报屏

### Requirement: 虚拟消息 SHALL 不参与会话历史构建

虚拟 AI 消息和对应的用户消息 SHALL 被标记为虚拟，在构建后端 SSE 的 `conversation_history` 上下文时被跳过。

#### Scenario: 虚拟消息不参与历史
- **WHEN** 用户随后发送一条真实消息
- **THEN** sendMessage 构建的 `conversation_history` SHALL 不包含虚拟消息及其对应的用户消息
- **AND** 虚拟消息仅用于本地渲染 InlineImageCard / InlineVideoCard
