# Delta: inline-video-gen（AI 优化传入图片上下文）

## ADDED Requirements

### Requirement: 视频卡片 AI 优化 SHALL 携带图片上下文

`InlineVideoCard` 调用 AI 优化时，SHALL 将第一张参考图的 caption（如有）作为 `image_context` 传入 `/api/v1/prompt/optimize`，使优化结果与参考图片内容相关。

#### Scenario: 有 caption 时优化结果与图片相关
- **GIVEN** 卡片渲染时消息携带参考图 caption
- **WHEN** 用户点击「✨ AI 优化」
- **THEN** 优化请求 SHALL 携带 `image_context`
- **AND** 优化后的视频描述 SHALL 与参考图主体一致

#### Scenario: 无 caption 时行为不变
- **GIVEN** 消息无参考图 caption
- **WHEN** 用户点击「✨ AI 优化」
- **THEN** 优化请求不携带 `image_context`，行为与现状一致
