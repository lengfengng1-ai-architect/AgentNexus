## MODIFIED Requirements

### MODIFIED: 意图识别输出使用统一结构化 Schema

#### MODIFIED Scenario: 输出结构校验
- **GIVEN** `intent_recognition` 节点返回结果
- **WHEN** 校验输出
- **THEN** 结果 SHALL 能通过 `IntentRecognitionOutput` 校验
- **AND** `intent` SHALL 为 `generate_plan`、`query_data`、`chat`、`clarify`、`update_context`、`generate_video` 之一

### NEW Requirement: 系统 SHALL 支持图生视频意图

系统 SHALL 通过 `generate_video` 意图识别用户想要生成视频的操作。

#### Scenario: 用户想用图片生成视频
- **GIVEN** 用户上传图片附件 + 输入"把这张图做成视频"
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `generate_video`
- **AND** `image_url` SHALL 从附件元数据提取
- **AND** `confidence` SHALL ≥ 0.8

#### Scenario: 用户想生成视频但未提供图片
- **GIVEN** 用户输入"帮我生成视频"
- **AND** 未提供图片附件
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `generate_video`
- **AND** `missing_fields` SHALL 包含 `image_url`
- **AND** `reply` SHALL 询问"请提供需要生成视频的图片"

### NEW Requirement: 前端 SHALL 展示视频生成状态机气泡

当前端收到 `intent: generate_video` 时，SHALL 展示可反映进度的状态机气泡，并在后台消费 `/video/generate` SSE。

#### Scenario: 视频生成气泡状态流转
- **WHEN** 前端收到 `intent: generate_video`
- **THEN** 显示一个聊天气泡，初始态为 "⏳ 正在生成视频…"
- **WHEN** 后端 `/video/generate` SSE 推送 `progress(task_created)`
- **THEN** 气泡状态 SHALL 变为 "⌛ 排队中"
- **WHEN** SSE 推送 `progress(polling, progress_pct)`
- **THEN** 气泡 SHALL 展示进度条和百分比
- **WHEN** SSE 推送 `progress(completed)`
- **THEN** 气泡 SHALL 展示视频播放器
- **WHEN** SSE 推送 `error`
- **THEN** 气泡 SHALL 展示错误信息
