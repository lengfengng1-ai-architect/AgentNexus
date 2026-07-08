## MODIFIED Requirements

### Requirement: 系统 SHALL 支持文生视频

系统 SHALL 根据用户提供的文本提示词，调用 HappyHorse T2V 模型生成短视频。当提供了 image_url 时，prompt 为可选。

#### Scenario: 纯图生视频（无 prompt）
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体中不含 `prompt` 但含有效 `image_url`
- **THEN** 系统 SHALL 调用 HappyHorse I2V 模型创建任务（仅使用图片帧）
- **AND** 通过 SSE 流式返回进度和结果

#### Scenario: 图+文生成视频
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体含有效 `image_url` 和 `prompt`
- **THEN** 系统 SHALL 调用 HappyHorse I2V 模型，图片帧 + prompt 生成视频
- **AND** 通过 SSE 流式返回进度和结果

### Requirement: 系统 SHALL 在测试页支持纯图生视频

VideoTestPage 的按钮守卫和自触发逻辑 SHALL 支持仅提供 image_url 无 prompt 的场景。

#### Scenario: 仅图片 URL 可触发生成
- **WHEN** 用户填写了 image_url 但未填写 prompt
- **THEN** [生成视频] 按钮 SHALL 可用
- **AND** 点击后 SHALL 调用 `/video/generate` 仅携带 image_url
