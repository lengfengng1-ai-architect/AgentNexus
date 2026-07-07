# Capability: image-to-video

## Purpose

提供图生视频（Image-to-Video）能力：用户通过提供图片 URL（如品牌主图、文生图结果），系统调用 DashScope HappyHorse I2V 模型生成动态短视频，并通过 SSE 流式推送进度和结果。

## Requirements

### Requirement: 系统 SHALL 支持通过图片 URL 生成动态视频

系统 SHALL 接受用户提供的图片 URL，将其作为视频生成的素材输入，生成一条动态短视频。

#### Scenario: 成功生成图生视频
- **WHEN** 用户提供有效的 `image_url` 和可选的 `prompt` 文字描述
- **THEN** 系统 SHALL 调用 HappyHorse I2V 模型创建视频生成任务
- **AND** 系统 SHALL 通过 SSE 流式返回任务进度和最终视频 URL

#### Scenario: image_url 参数格式校验
- **WHEN** 用户提交请求时 `image_url` 不是有效的 HTTP/HTTPS URL
- **THEN** 系统 SHALL 立即返回 422 错误，提示"图片 URL 格式无效"

#### Scenario: 图生视频参数合并规则
- **WHEN** `image_url` 和 `prompt` 同时提供
- **THEN** 系统 SHALL 将两者作为 I2V 输入的 `input.image_url` 和 `input.prompt`
- **AND** 图片为主要输入，prompt 辅助描述期望的动态效果

### Requirement: 图生视频 SHALL 复用文生视频的统一端点

图生视频和文生视频共享 `POST /video/generate` 端点，通过 `image_url` 字段区分。

#### Scenario: 统一分发
- **WHEN** 请求 body 包含 `image_url`
- **THEN** 系统 SHALL 走 I2V 创建逻辑
- **WHEN** 请求 body 不含 `image_url`
- **THEN** 系统 SHALL 走现有 T2V 创建逻辑

### Requirement: 图生视频 SHALL 保持和文生视频一致的 SSE 推送格式

图生视频的 SSE 事件类型（progress / result / error）和字段结构（stage / task_id / status / message / elapsed）与文生视频完全一致。

#### Scenario: SSE 事件格式一致
- **WHEN** 图生视频任务完成后
- **THEN** 前端 SHALL 不额外修改 SSE 事件处理代码即可展示结果

### Requirement: 系统 SHALL 通过 SSE 持续推送生成进度

图生视频任务创建后，轮询阶段系统 SHALL 每轮推送一次 progress event，确保前端持续收到"生成中"更新的状态。

#### Scenario: 轮询阶段持续推送
- **GIVEN** 图生视频任务已创建
- **WHEN** 系统正在轮询任务状态
- **THEN** 每次轮询结果（RUNNING/PENDING）都 SHALL yield 一条 `progress` event
- **AND** event 中 SHALL 包含 `elapsed`（已等待秒数）和 `stage: "polling"`
