---
capability: mobile-chat-session
name: 移动端对话会话管理
description: 移动端工作台①对话入口屏的完整对话管理：SSE 流式收发、品牌信息积累、错误重试、文件上传
---

## Purpose

移动端工作台①对话入口屏通过 `useChat` hook 对接后端 `/chat/stream` SSE 端点，实现与桌面端一致的完整对话能力，包括消息发送、SSE 流式推理与回复、品牌信息逐步积累、canGeneratePlan 导航到简报屏、文件附件上传。

## ADDED Requirements

### Requirement: 对话消息通过 SSE 流式收发

ScreenChat SHALL 使用 `useChat` hook 管理对话状态，通过 `streamChat`（`workflow.ts`）将用户消息发送到 `POST /chat/stream`，并通过 SSE 事件流接收推理过程和意图识别结果。

#### Scenario: 发送消息收到流式回复
- **WHEN** 用户在输入框输入消息并点击发送（或按 Enter）
- **THEN** `sendMessage()` SHALL 被调用，消息列表 SHALL 追加用户消息
- **AND** 输入框 SHALL 清空
- **AND** 对话流 SHALL 出现 loading 气泡（TypingIndicator）
- **AND** 后端返回 `event: reasoning` 时，气泡 SHALL 逐字显示推理过程（TypingReasoning 打字机效果）
- **AND** 后端返回 `event: intent` 时，气泡 SHALL 显示完整的 Agent 回复内容

#### Scenario: 流式错误时显示错误状态
- **WHEN** 流式请求抛出异常（网络错误、服务器错误）
- **THEN** 上一次用户消息 SHALL 标记为错误态（isError + retryable）
- **AND** ScreenChat 顶部 SHALL 显示 ErrorBar 错误提示
- **WHEN** 用户点击「重试」按钮
- **THEN** `retryMessage()` SHALL 被调用，重新发起 SSE 请求

### Requirement: 品牌信息随着对话逐步积累

通过多轮对话，`intent_recognition` agent 逐步提取用户消息中的品牌信息（brand_name、category、city、budget、period），`useChat` 自动在上下文中传递已积累的 `brand_input`。

#### Scenario: 多轮对话积累品牌信息
- **WHEN** 用户在第二轮消息中补充了城市信息
- **THEN** 后端 `POST /chat/stream` 请求的 `context.brand_input` SHALL 包含前一轮已提取的品牌名和本轮补充的城市
- **AND** Agent 回复中包含已确认的品牌信息汇总

### Requirement: canGeneratePlan 时支持跳转到简报屏

当后端返回 `canGeneratePlan=true` 时，`ChatBubble` SHALL 渲染「生成方案」按钮，点击后触发从对话入口导航到②简报屏。

#### Scenario: 品牌信息完整后显示方案按钮
- **WHEN** AI 消息的 `canGeneratePlan` 为 `true`
- **THEN** 该气泡下端 SHALL 显示「生成方案」按钮
- **WHEN** 用户点击该按钮
- **THEN** Tab 切换器 SHALL 切换到②简报标签
- **AND** 手机框架内 SHALL 切换为②简报屏内容

### Requirement: 文件附件上传

ScreenChat SHALL 支持用户选择文件，上传到服务器，获得的 URL 随消息发送到 `/chat/stream`。桌面端 ChatInput 的文件上传流程（`FormData` → `POST /api/v1/upload` → `sendMessage(text, urls)`）作为参考实现。

#### Scenario: 选择图片并发送
- **WHEN** 用户点击附件按钮，选择了一张图片
- **THEN** 文件 SHALL 通过 `POST /api/v1/upload` 上传到服务器
- **AND** 返回的 URL SHALL 随消息一起通过 `sendMessage(text, imageUrls=[url])` 发送
- **AND** 后端 SHALL 在 context 中收到 `image_urls` 信息

#### Scenario: 上传失败显示提示
- **WHEN** 文件上传请求失败（网络断开、服务器错误）
- **THEN** ScreenChat SHALL 显示错误提示（Toast 或 ErrorBar）
- **AND** 输入框状态 SHALL 保持不变，不丢失已输入的文字

### Requirement: 后端在无上下文时自动回复欢迎语

后端 `/chat/stream` 端点在 context 中没有 `brand_input` 和 `conversation_history` 时，通过 intent_recognition 的 prompt 自然回复一段欢迎语，类似当前 INITIAL[0] 的内容。

#### Scenario: 首次发送消息收到欢迎语
- **WHEN** 用户首次进入对话框并发送第一条消息（无上下文）
- **THEN** 后端 SHALL 返回包含欢迎/引导性质的 Agent 回复
- **AND** 回复内容 SHALL 介绍自己的身份和可提供的帮助
