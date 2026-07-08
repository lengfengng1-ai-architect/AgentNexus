## Context

图片生成已有完整后端能力（`POST /api/v1/image/generate` → `run_image_generation` → `Qwen-Image API`），以及独立 `ImageTestPage` 页面。但对话中 `text_to_image` 意图识别后，仅返回文字回复，不触发生成。用户得不到执行反馈，也不生成图片。

需复用在 InlineVideoCard 上已验证的对话内嵌模式。

## Goals / Non-Goals

**Goals:**
- ChatBubble 收到 `text_to_image` intent 时渲染 InlineImageCard
- 显示 Prompt 预览 + [生成图片] 按钮
- 调用 `POST /api/v1/image/generate` 生成图片
- 加载中/成功/失败状态
- 图片全屏查看
- 结果持久化到 ChatMessage.imageResult

**Non-Goals:**
- 不修改后端 `/api/v1/image/generate` 接口
- 不修改 intent 识别逻辑
- 不引入 SSE 流式（图片为同步 POST，无需进度条）
- 不删除 ImageTestPage 页面

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | InlineImageCard 自包含状态 | 同步 POST，状态简单，无 reducer 耦合 |
| 2 | 使用 POST + spinner 非 SSE | 图片生成约 10-30s，单个请求即可，无需事件流 |
| 3 | Prompt 直接显示 intent 返回的 generationPrompt | 用户输入的 Prompt 已在意图识别中提取，无需额外 LLM 调用 |
| 4 | imageResult 回写 ChatMessage | 刷新页面后不丢失 |

## Risks / Trade-offs

- **[Risk] 图片生成耗时 10-30s，无进度反馈**：前端显示 spinner + "正在生成图片，请稍候…"，与 InlineVideoCard 的 SSE 进度条不同。→ **Accept**: 同步 POST 是 Qwen-Image API 的限制
