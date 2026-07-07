# Capability: video-generation

## Purpose

提供视频生成能力，支持文生视频（Text-to-Video）和图生视频（Image-to-Video）两种模式。调用阿里云百炼 DashScope HappyHorse 系列模型，通过 SSE 流式推送任务进度和最终视频 URL。

## Requirements

### Requirement: 系统 SHALL 支持文生视频

系统 SHALL 根据用户提供的文本提示词，调用 HappyHorse T2V 模型生成短视频。

#### Scenario: 文生视频标准流程
- **WHEN** 用户提交 `POST /video/generate`，请求体中不含 `image_url`
- **THEN** 系统 SHALL 调用 HappyHorse T2V 模型创建任务
- **AND** 通过 SSE 流式返回进度和结果

### Requirement: 系统 SHALL 支持图生视频

系统 SHALL 根据用户提供的图片 URL（和可选的文字描述），调用 HappyHorse I2V 模型生成动态短视频。

#### Scenario: 图生视频标准流程
- **WHEN** 用户提交 `POST /video/generate`，请求体含有效 `image_url`
- **THEN** 系统 SHALL 调用 HappyHorse I2V 模型创建任务
- **AND** 通过 SSE 流式返回进度和结果

### Requirement: 系统 SHALL 通过 SSE 持续推送生成进度

视频生成任务创建后，轮询阶段系统 SHALL 每次轮询推送一次 progress event，确保前端持续收到状态更新。

#### Scenario: 轮询阶段持续推送
- **GIVEN** 视频任务已创建
- **WHEN** 系统正在轮询任务状态
- **THEN** 每次轮询结果非终态时，SHALL yield 一条 `progress` event
- **AND** event 中包含 `elapsed` 累计秒数和 `stage` 状态

#### Scenario: 轮询网络抖动不中断
- **GIVEN** 系统正在轮询视频任务
- **WHEN** 某次 HTTP 查询因网络原因失败
- **THEN** 系统 SHALL 跳过该次轮询，推一条 progress 提示"正在处理中"
- **AND** 系统 SHALL 在等待 5s 后继续下一次轮询

### Requirement: 系统 SHALL 在任务完成时返回视频 URL

当视频生成任务完成（SUCCEEDED）时，系统 SHALL 通过 `result` SSE event 返回视频 URL。

#### Scenario: 返回视频 URL
- **WHEN** 视频任务状态变为 SUCCEEDED
- **THEN** 系统 SHALL 推送 `result` event，包含 `video_url` 字段
- **AND** 包含任务 task_id 和生成参数信息

### Requirement: 系统 SHALL 处理任务失败和异常

当视频生成任务失败（FAILED）、取消（CANCELED）或超时时，系统 SHALL 通过 `error` SSE event 返回明确的错误信息。

#### Scenario: 任务失败返回错误
- **WHEN** 视频任务状态变为 FAILED
- **THEN** 系统 SHALL 推送 `error` event，包含错误描述和错误码

#### Scenario: 任务超时处理
- **GIVEN** 视频任务已创建
- **WHEN** 等待超过 600 秒仍无终态
- **THEN** 系统 SHALL 推送 `error` event，提示"超过最大等待时间"

### Requirement: 视频 SHALL 支持多种规格参数

系统 SHALL 支持用户选择分辨率、宽高比、时长和随机种子。

#### Scenario: 参数传递
- **WHEN** 用户提交 `POST /video/generate`
- **THEN** 参数 resolution / ratio / duration / seed SHALL 透传到 HappyHorse API 的 parameters 中
