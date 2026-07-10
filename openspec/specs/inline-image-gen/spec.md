# Capability: inline-image-gen

## Purpose

在对话上下文中内嵌图片生成能力。用户无需离开聊天页面即可查看 Prompt 预览、一键生成图片、查看结果。复用后端 `/api/v1/image/generate` 接口，不改变后端逻辑。

## Requirements

### Requirement: ChatBubble SHALL 渲染 InlineImageCard

收到 `text_to_image` intent 时，ChatBubble SHALL 渲染 InlineImageCard，替代纯文字回复。

#### Scenario: text_to_image 渲染卡片
- **GIVEN** 用户输入包含详细的图片描述
- **WHEN** intent_recognition 返回 `intent: text_to_image` 且 generationPrompt 长度 > 3
- **THEN** ChatBubble 渲染 InlineImageCard
- **AND** Card 显示 generationPrompt 文本预览
- **AND** Card 显示 [生成图片] 按钮

#### Scenario: 无 generation_prompt 时不渲染
- **GIVEN** 用户只说"生成一张图片"没有描述
- **WHEN** intent_recognition 返回 `intent: text_to_image` 但 generationPrompt 为空或长度 ≤ 3
- **THEN** 不渲染 InlineImageCard
- **AND** 回复文本提示用户提供详细描述

### Requirement: 点击生成按钮 SHALL 调用图片生成 API

用户点击 [生成图片] 按钮后，SHALL 调用 `POST /api/v1/image/generate` 并显示加载状态。

#### Scenario: 点击生成按钮
- **WHEN** 用户点击 [生成图片] 按钮
- **THEN** 按钮变为禁用状态，显示 spinner + "正在生成图片，请稍候…"
- **AND** 调用 `POST /api/v1/image/generate { prompt, size }`
- **AND** 如果 API 返回成功，显示生成的图片
- **AND** 如果 API 返回错误，显示错误提示 + 重试按钮

### Requirement: 生成结果 SHALL 持久化

图片生成完成后，SHALL 将结果回写到 ChatMessage.imageResult。

#### Scenario: 生成成功写入 message
- **WHEN** API 返回 image_url
- **THEN** ChatMessage.imageResult SHALL 被更新为 `{ image_url, prompt_used?, width?, height? }`
- **AND** 刷新页面后恢复显示图片

#### Scenario: 生成失败不写入
- **WHEN** API 返回错误
- **THEN** ChatMessage.imageResult SHALL 保持 undefined
- **AND** 错误信息在 InlineImageCard 中显示

### Requirement: 图片 SHALL 支持全屏查看

生成完成后 SHALL 支持点击图片或按钮全屏查看。

#### Scenario: 全屏查看图片
- **WHEN** 用户点击图片或全屏按钮
- **THEN** 弹窗覆盖整个视口，图片居中显示
- **AND** 点击遮罩或关闭按钮退出全屏

### Requirement: 生成失败 SHALL 支持重试

#### Scenario: 失败后重试
- **WHEN** 图片生成失败
- **THEN** 显示红色错误提示
- **AND** 显示 [重试] 按钮
- **WHEN** 用户点击重试
- **THEN** 清除错误状态，重新调用 API

### Requirement: InlineImageCard SHALL 支持移动端 variant 样式

`variant="mobile"` 时 InlineImageCard SHALL 切换为移动端蓝色系色值、缩紧间距、调小字号。桌面端行为零变化。

#### Scenario: variant=mobile 时使用移动端样式
- **WHEN** InlineImageCard 的 `variant` prop 为 `"mobile"`
- **THEN** 卡片背景为 `bg-[#f7f8fa]`（替代 `bg-mist/50`）
- **AND** 卡片边框为 `border-[#d9dee7]`（替代 `border-line`）
- **AND** 主按钮背景为 `bg-[#1677ff]`（替代 `bg-start`）
- **AND** 标签/说明文字色为 `text-[#6b7280]`（替代 `text-track/50`）
- **AND** 卡片内边距为 `p-2.5`（替代 `p-3`）
- **AND** 主体字号为 `text-[11px]`（替代 `text-xs`/12px）
- **AND** label 字号为 `text-[9px]`（替代 `text-[10px]`）
- **AND** 生成按钮字号为 `text-xs`（替代 `text-sm`/14px）

#### Scenario: variant 不传或为 undefined 时使用桌面端样式
- **WHEN** InlineImageCard 的 `variant` prop 未传或为 `undefined`
- **THEN** 使用桌面端原有样式（`bg-mist/50`、`border-line` 等）
- **AND** 所有样式行为与修改前一致
