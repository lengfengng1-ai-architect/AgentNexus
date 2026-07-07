## Context

现有 HappyHorse T2V（文生视频）已通过 `POST /video/generate` 端点提供视频生成服务，包含任务创建 + 轮询 + SSE 流式推送的全流程。DashScope 同样提供 HappyHorse I2V（图生视频）模型，API 接口与 T2V 完全一致（同为异步创建→轮询模式），仅请求 body 的 `input` 字段结构不同。

核心设计思路：T2V 和 I2V 的差异仅在创建任务时的请求体，轮询逻辑完全一致。因此采用**统一端点 + 内部分支**方案，避免代码重复。

## Goals / Non-Goals

**Goals:**
- 在现有 `POST /video/generate` 端点支持 `image_url` 参数，有则走 HappyHorse I2V，无则走 T2V
- SSE 推送 enhanced：轮询阶段前端持续收到 progress 事件（每 5s），带 `elapsed` 累计时间和 `stage` 状态
- 新增环境变量 `DASHSCOPE_I2V_MODEL` 配置图生视频模型名
- 前端 `VideoTestPage.tsx` 增加可选的图片 URL 输入框
- 将 `video-generation` 加入 `docs/superpowers.yaml` in_scope

**Non-Goals:**
- 不做图片上传功能（用户提供已是有效 URL 的图片链接）
- 不改 CSS/UI 视觉风格，只增加必要交互
- 不改现有 T2V 的 SSE 事件格式和前端事件处理代码

## Decisions

### Decision 1: 统一端点 vs 独立端点

**选择：统一端点（POST /video/generate + 可选 image_url）**

- 理由：T2V 和 I2V 的业务流程、轮询逻辑、SSE 推送格式完全一致，合并可复用整个 `stream_video_generation()` 和现有前端 SSE 处理代码
- 替代方案：新增 `POST /video/image-to-video` 端点 → 代码重复过多，前端需新增事件监听逻辑

### Decision 2: Agent 层分支策略

**选择：在 `create_video_task()` 内部根据 `image_url` 决定请求体结构**

- `_build_create_body()` 私有函数根据 `image_url` 是否存在组装不同输入：
  - 有 URL → `model: happyhorse-1.1-i2v`, `input: { prompt?, img_url }`
  - 无 URL → `model: happyhorse-1.1-t2v`, `input: { prompt }`
- 轮询复用 `poll_video_task()` 不变（DashScope I2V/T2V 共用同一 GET /tasks/{id} 查询接口）

### Decision 3: SSE 进度增强

**选择：轮询阶段每次循环 push progress event 带 `stage: "processing"`**

现有实现每 5s 轮询就 yield 一次 progress，前端可据此展示"生成中"。本次增强没有改变 JSON schema，只是确保 I2V 流程也保持相同节奏。轮询失败时（网络抖动）跳过当前轮次继续重试，不中断流，保证用户体验不会看到"卡住"的假象。

### Decision 4: 配置管理

**选择：通过 Settings 管理双模型名**

- `dashscope_video_model` → T2V 模型（现有，默认 `happyhorse-1.1-t2v`）
- `dashscope_i2v_model` → I2V 模型（新增，默认 `happyhorse-1.1-i2v`）

## Risks / Trade-offs

- [风险] HappyHorse I2V 模型对图片尺寸/格式有隐含要求 → 前端暂不校验，API 异常时通过 error event 返回具体错误信息给用户
- [风险] image_url 为外部链接可能失效 → 文档注明建议使用阿里云 OSS 或文生图生成的图片 URL
- [风险] 统一端点改现有 `VideoGenerateRequest` schema 影响前端 TypeScript 类型 → 前端增加可选字段，向后兼容
