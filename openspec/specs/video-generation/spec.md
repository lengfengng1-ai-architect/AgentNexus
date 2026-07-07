# Capability: video-generation

## Purpose

为 AllyGo 营销方案 Agent 提供文生视频能力,对接阿里云百炼 HappyHorse 文生视频模型。支持 SSE 流式返回任务进度和最终视频 URL,轮询期间持续输出 progress 事件防止连接空闲超时。

## Requirements

### Requirement: 文生视频 SSE 流式生成

系统 SHALL 提供 `POST /api/v1/video/generate` 端点,接收 prompt + 分辨率/比例/时长参数,SSE 流式返回任务进度和最终视频 URL。轮询期间每次循环 MUST 至少 yield 一个 progress 事件,防止 SSE 长连接空闲超时。

#### Scenario: 成功生成视频
- **WHEN** 用户提交合法 prompt 且任务 SUCCEEDED
- **THEN** 端点依次返回 progress(task_created)→ progress(polling,多次)→ progress(completed)→ result(含 video_url)

#### Scenario: 任务失败
- **WHEN** 视频任务返回 FAILED 状态
- **THEN** 端点返回 error 事件,detail 包含 API 返回的失败原因

#### Scenario: 轮询期间网络抖动
- **WHEN** 轮询 HTTP 调用抛出网络异常
- **THEN** 系统 yield polling progress 并在下一轮重试,不中断流

### Requirement: 视频模型可配置

系统 SHALL 通过 `DASHSCOPE_VIDEO_MODEL` 配置项指定文生视频模型,默认 `happyhorse-1.1-t2v`,不在外部环境暴露具体模型名以外的敏感信息。

#### Scenario: 切换视频模型
- **WHEN** 配置文件修改 DASHSCOPE_VIDEO_MODEL 值
- **THEN** 下次视频生成请求使用新模型名,无需改代码
