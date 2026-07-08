# Capability: video-generation

## Purpose

提供视频生成能力，支持文生视频（Text-to-Video）和图生视频（Image-to-Video）两种模式。调用阿里云百炼 DashScope HappyHorse 系列模型，支持 SSE 流式返回任务进度和最终视频 URL，轮询期间持续输出 progress 事件防止连接空闲超时。

## Requirements

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

### Requirement: 系统 SHALL 支持文生视频

系统 SHALL 根据用户提供的文本提示词，调用 HappyHorse T2V 模型生成短视频。当提供了 image_url 时，prompt 为可选。

#### Scenario: 文生视频标准流程
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体中不含 `image_url`
- **THEN** 系统 SHALL 调用 HappyHorse T2V 模型创建任务
- **AND** 通过 SSE 流式返回进度和结果
- **AND** 端点依次返回 progress(task_created)→ progress(polling,多次)→ progress(completed)→ result(含 video_url)

### Requirement: 系统 SHALL 支持图生视频

系统 SHALL 根据用户提供的图片 URL（和可选的文字描述），调用 HappyHorse R2V 模型生成动态短视频，支持 1-9 张参考图片。

#### Scenario: 图生视频标准流程
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体含有效 `image_urls`
- **THEN** 系统 SHALL 调用 HappyHorse R2V 模型创建任务，`media[].type` 为 `reference_image`
- **AND** 通过 SSE 流式返回进度和结果

#### Scenario: 纯图生视频（无 prompt）
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体中不含 `prompt` 但含有效 `image_urls`
- **THEN** 系统 SHALL 调用 HappyHorse R2V 模型创建任务（仅使用参考图片）
- **AND** 通过 SSE 流式返回进度和结果

#### Scenario: 图+文生成视频
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体含有效 `image_urls` 和 `prompt`
- **THEN** 系统 SHALL 调用 HappyHorse R2V 模型，参考图片 + prompt 生成视频
- **AND** 通过 SSE 流式返回进度和结果

### Requirement: 系统 SHALL 校验 prompt 和 image_urls 至少提供一个

POST /api/v1/video/generate 的请求体中，prompt 为可选字段，但必须与 image_urls 至少提供一个。

#### Scenario: prompt 和 image_urls 均缺失
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体中既无 `prompt` 也无 `image_urls`
- **THEN** 系统 SHALL 返回 422 Validation Error
- **AND** 错误信息提示 "prompt 和 image_urls 至少提供一个"

#### Scenario: 多图生视频标准流程
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体含 `image_urls: ["url1", "url2", "url3"]`
- **THEN** 系统 SHALL 调用 HappyHorse R2V 模型创建任务
- **AND** 请求体中 `input.media` SHALL 包含对应数量的 reference_image 条目

#### Scenario: 超过 9 张图片
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体含 `image_urls` 超过 9 个元素
- **THEN** 系统 SHALL 返回 422 Validation Error，提示最多支持 9 张图片

### Requirement: 系统 SHALL 通过 SSE 持续推送生成进度

视频生成任务创建后，轮询阶段系统 SHALL 每次轮询推送一次 progress event，确保前端持续收到状态更新。

#### Scenario: 轮询阶段持续推送
- **GIVEN** 视频任务已创建
- **WHEN** 系统正在轮询任务状态
- **THEN** 每次轮询结果非终态时，SHALL yield 一条 `progress` event
- **AND** event 中包含 `elapsed` 累计秒数、`stage` 状态和 `progress_pct` 估算百分比

#### Scenario: 轮询网络抖动不中断
- **GIVEN** 系统正在轮询视频任务
- **WHEN** 某次 HTTP 查询因网络原因失败
- **THEN** 系统 SHALL 跳过该次轮询，推一条 progress 提示"正在处理中"
- **AND** 系统 SHALL 在等待（前 30s 每 5s，之后每 10s）后继续下一次轮询

### Requirement: SSE progress SHALL 包含估算百分比

系统 SHALL 在每次 progress SSE event 中附带 `progress_pct` 字段（0-100），表示视频生成进度的估算百分比。

#### Scenario: progress event 携带 progress_pct
- **GIVEN** 视频生成任务正在轮询
- **WHEN** 系统每次 yield progress 时
- **THEN** event 数据中 SHALL 包含整数 `progress_pct` 字段
- **AND** 非终态进度计算规则为 `min(90, int(elapsed / max_poll_seconds * 90))`（最大 90%），其中 `max_poll_seconds` 动态计算公式为 `clamp(120 + duration × 40, 180, 600)`
- **AND** 任务完成时 `progress_pct` 为 100

### Requirement: 轮询间隔 SHALL 动态调整

轮询间隔应根据已等待时间动态调整，在前 30s 频率较高，之后降低以减少 SSE 消息噪音。

#### Scenario: 动态轮询间隔
- **WHEN** 系统正在轮询视频任务
- **THEN** 前 30s 轮询间隔 SHALL 为 5s
- **AND** 超过 30s 后轮询间隔 SHALL 为 10s

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
- **WHEN** 等待超过 MAX_POLL_SECONDS（固定 600s 用于 poll 超时终止）仍无终态
- **THEN** 系统 SHALL 推送 `error` event，提示"超过最大等待时间"

### Requirement: 视频 SHALL 支持多种规格参数

系统 SHALL 支持用户选择分辨率、宽高比、时长和随机种子。

#### Scenario: 参数传递
- **WHEN** 用户提交 `POST /api/v1/video/generate`
- **THEN** 参数 resolution / ratio / duration / seed SHALL 透传到 HappyHorse API 的 parameters 中

### Requirement: 视频模型可配置

系统 SHALL 通过 `DASHSCOPE_VIDEO_MODEL` 配置项指定文生视频模型，默认 `happyhorse-1.1-t2v`，不在外部环境暴露具体模型名以外的敏感信息。

#### Scenario: 切换视频模型
- **WHEN** 配置文件修改 DASHSCOPE_VIDEO_MODEL 值
- **THEN** 下次视频生成请求使用新模型名，无需改代码

### Requirement: prompt 字段 SHALL 有长度限制

`POST /api/v1/video/generate` 的 `prompt` 字段 SHALL 设置最大长度限制，超出时返回 422 校验错误。

#### Scenario: prompt 超限返回 422
- **WHEN** 用户提交 `POST /api/v1/video/generate`，`prompt` 字符数超过 10000
- **THEN** 系统 SHALL 返回 422 Validation Error
- **AND** 错误信息提示 prompt 超长

#### Scenario: prompt 长度在限制内正常处理
- **WHEN** 用户提交 `POST /api/v1/video/generate`，`prompt` 字符数 ≤ 10000
- **THEN** 系统 SHALL 正常生成视频
- **AND** 响应不受影响

### Requirement: R2V 图生视频模型可配置

### Requirement: ImageThumbnail SHALL 正常加载图片

ImageThumbnail 组件 SHALL 确保图片被浏览器正常请求加载，不因 DOM 状态导致请求被抑制。

#### Scenario: 图片加载成功渲染
- **WHEN** ImageThumbnail 接收到有效图片 URL
- **THEN** `<img>` SHALL 发起 HTTP 请求，不因 `display: none` 或 `loading="lazy"` 被抑制
- **AND** 加载完成后渲染图片

#### Scenario: 图片加载失败显示占位
- **WHEN** 图片 URL 不可访问
- **THEN** `<img>` onError SHALL 触发
- **AND** 组件显示"加载失败"占位符

### Requirement: URL 输入 SHALL 使用行级交互

VideoTestPage SHALL 使用独立的 URL 输入行替代多行 textarea。

#### Scenario: 自动追加空行
- **WHEN** 用户输入一个有效的图片 URL
- **THEN** 系统 SHALL 自动在下方追加一个空的 URL 输入框

#### Scenario: 删除 URL 行
- **WHEN** 用户点击某 URL 行的删除按钮
- **THEN** 该行 SHALL 被移除
- **AND** 对应的缩略图 SHALL 消失

系统 SHALL 通过 `DASHSCOPE_R2V_MODEL` 配置项指定图生视频模型，默认 `happyhorse-1.1-r2v`，不在外部环境暴露具体模型名以外的敏感信息。

#### Scenario: 切换 R2V 模型
- **WHEN** 配置文件修改 DASHSCOPE_R2V_MODEL 值
- **THEN** 下次图生视频生成请求使用新模型名，无需改代码
