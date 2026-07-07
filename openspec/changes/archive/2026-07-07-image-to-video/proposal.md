## Why

现有文生视频（HappyHorse T2V）已实现营销宣传视频生成。用户希望进一步支持**图生视频**（Image-to-Video）：以图片为素材生成动态短视频。图生视频适用于品牌主图动态化、静态海报转短视频等场景，同时支持从文生图结果中接力生成，丰富营销方案的视觉表现。

## What Changes

- 在现有 `POST /video/generate` 端点增加可选 `image_url` 参数：有则走 HappyHorse I2V 模型，无则走现有 T2V
- 新增 `DASHSCOPE_I2V_MODEL` 环境变量配置图生视频模型名
- Agent 层 `stream_video_generation()` 增加 `image_url` 分支：检测到图片 URL 则切换到 I2V 创建任务逻辑，轮询和结果推送复用现有代码
- SSE progress 事件新增 `stage: "processing"` 状态，增强轮询阶段的信息反馈，确保前端持续展示"生成中"状态
- 前端 `VideoTestPage.tsx` 增加可选的图片 URL 输入框，SSE 事件处理逻辑不变
- 将 `video-generation` 加入 `docs/superpowers.yaml` in_scope

### Non-goals

- 本 change 不做图片上传功能（输入为图片 URL，支持从文生图结果直接引用）
- 本 change 不改 CSS/UI 视觉风格，只增加必要交互

## Capabilities

### New Capabilities

- `image-to-video`: 图生视频能力，支持用户提供图片 URL 生成动态短视频

### Modified Capabilities

- `promo-video`: 营销方案流水线中的视频生成增加图生视频路径（如果 action_recommendations 产出中有图片 URL，可用作视频素材输入）
- `video-generation`: （新增到 superpowers.yaml in_scope）涵盖文生视频和图生视频

## Impact

| 层 | 文件 | 改动 |
|---|---|---|
| API | `backend/app/routers/video.py` | `VideoGenerateRequest` 增加可选 `image_url` 字段 |
| Agent | `backend/app/agents/video_generation_agent.py` | `stream_video_generation()` 增加 I2V 任务创建分支；`create_video_task()` 重构为支持 T2V/I2V |
| 配置 | `backend/app/config/settings.py` | 新增 `dashscope_i2v_model` 配置 |
| 配置 | `docs/superpowers.yaml` | `video-generation` 加入 in_scope，包含图生视频子能力 |
| 前端 | `frontend/src/pages/VideoTestPage.tsx` | 增加图片 URL 输入框 |
| 测试 | `backend/tests/` | 增加图生视频分支的单元测试 |
