# Capability: video-generation (delta)

## MODIFIED Requirements

### Requirement: 视频 SHALL 支持从对话内嵌生成

系统识别到 `text_to_video` 或 `generate_video` 意图时，SHALL 在聊天气泡中直接渲染 InlineVideoCard，不再跳转独立页面。Card 自包含图片编辑、参数调整、生成、进度条、播放器功能。

#### Scenario: 文生视频内嵌渲染
- **GIVEN** 用户输入"生成一段夕阳海滩的视频"
- **WHEN** intent_recognition 返回 `intent: text_to_video` 且 generationPrompt 长度 > 3
- **THEN** 聊天气泡渲染 InlineVideoCard，prompt 预填入参数面板
- **AND** 不跳转页面

#### Scenario: 图生视频内嵌渲染
- **GIVEN** 用户上传图片 + 输入"把这张图做成视频"
- **WHEN** intent_recognition 返回 `intent: generate_video` 且 imageUrl 存在
- **THEN** 聊天气泡渲染 InlineVideoCard，图片 URL 自动填入附件栏
- **AND** 不跳转页面

#### Scenario: text_to_video 无 generation_prompt 时不渲染视频卡片
- **GIVEN** 用户输入"生成一段视频"
- **WHEN** intent_recognition 返回 `intent: text_to_video` 但 generationPrompt 为空或长度 ≤ 3
- **THEN** 不渲染 InlineVideoCard
- **AND** 回复文本提示用户提供更详细的描述

### Requirement: 系统 SHALL 支持 ChatMessage 持久化视频生成结果

当 InlineVideoCard 完成生成后，系统 SHALL 将结果回写到 ChatMessage.videoResult 字段，确保页面刷新后播放器不丢失。

#### Scenario: 视频生成结果写入 message
- **WHEN** SSE 流返回 result event（含 video_url 和 task_id）
- **THEN** ChatMessage.videoResult SHALL 被更新为 `{ task_id, video_url, usage? }`
- **AND** message 持久化后刷新页面重新打开，播放器恢复显示已完成的视频

#### Scenario: 视频生成失败不写入结果
- **WHEN** SSE 流返回 error event
- **THEN** ChatMessage.videoResult SHALL 保持 undefined
- **AND** 错误信息在 InlineVideoCard 中显示

## REMOVED Requirements

### Requirement: 视频 SHALL 支持从对话跳转自触发

**Reason**: 页面跳转已被对话内嵌 InlineVideoCard 替代。用户不再需要离开对话上下文即可完成视频生成。
**Migration**: 旧行为（跳转按钮 + 页面导航）已移除。ChatBubble 不再接收或使用 `onNavigateVideo`/`onNavigateImage` props。

#### Scenario: (removed) 文生视频从对话跳转
#### Scenario: (removed) 图生视频从对话跳转
#### Scenario: (removed) text_to_video 无 generation_prompt 时不显示按钮
