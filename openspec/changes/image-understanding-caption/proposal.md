# Proposal: image-understanding-caption

## Why

用户上传图片后，全链路 LLM（意图识别 deepseek-v4-flash、prompt 优化）都是纯文本模型，图片只以 URL 字符串出现在 prompt 中，模型看不到图片内容。导致：以图生视频/以图生图卡片无参数预填（"生成产品宣传片"提取不到任何视觉描述）、AI 优化输出与图片无关。

## What Changes

- 新增图片理解服务：`POST /upload` 保存图片后同步调用 qwen-vl-plus 生成 1-2 句中文客观描述（caption），响应 `UploadFileItem` 新增 `caption` 字段；VL 失败/超时（20s）降级为 null，不阻塞上传
- 意图识别增强：context 新增 `image_captions`，prompt 模板渲染「附件图片描述」；以图生图/生视频时 `generation_prompt`/`video_prompt` 结合 caption + 用户文字生成具体描述（预填卡片）
- prompt 优化增强：`/prompt/optimize` 请求体新增可选 `image_context`，模板渲染「参考图片内容」；前端 `optimizePrompt` 及两张卡片调用处传入 caption
- 前端：`ChatMessage` 增加 captions 存储（与 imageUrls 并行），`sendMessage` context 组装 `image_captions`（跨轮延续，与 getLatestImageUrls 同款逻辑），随 localStorage 历史持久化
- 补齐 `/prompt/optimize` 缺失的 OpenAPI 契约（既有缺口）

## Capabilities

### New Capabilities

- `image-caption`: 图片理解服务——上传时调用视觉模型生成客观描述，供意图识别、卡片预填、prompt 优化消费；含失败降级

### Modified Capabilities

- `chat-attachment-file-upload`: 上传接口响应新增 `caption` 字段（契约变更）
- `intent-recognition`: 意图识别 prompt 消费图片 caption，预填以图生图/生视频的生成描述
- `inline-image-gen`: 移动端/PC 卡片 AI 优化调用传入图片上下文
- `inline-video-gen`: 同上

## Impact

- **后端新增**：`app/services/image_caption.py`（qwen-vl-plus 调用，复用现有 DashScope key/base_url，无新依赖）
- **后端改动**：`routers/upload.py`（并发生成 caption）、`schemas/upload.py`（+caption）、`agents/intent_recognition_agent.py`（context 透传 + prompt 变量）、`prompt_templates/intent_recognition.md.j2`（caption 区块 + 预填规则）、`routers/prompt_optimizer.py` + `services/prompt_optimizer.py` + `prompt_templates/prompt_optimizer.md.j2`（image_context）
- **OpenAPI 契约**：`docs/api/paths/upload.yaml`（+caption）、新增 `docs/api/paths/prompt-optimizer.yaml`
- **前端改动**：`types/chat.ts`（ChatMessage +imageCaptions）、`ScreenChat.tsx`（上传响应存 caption、context 组装）、`useChat.ts`（getLatestImageCaptions）、`api/promptOptimizer.ts`（+imageContext 可选参）、`InlineImageCard.tsx`/`InlineVideoCard.tsx`（优化调用传 caption）
- **in_scope**：video-generation（以图生视频链路体验增强）；caption 服务于现有以图生图/生视频能力
- **mock 数据**：不涉及（caption 来自真实 VL API；测试用 mock VL 响应）
- **运行时成本**：每次上传图片 +1 次 VL 调用（约 1-2s，多图并发）；失败降级不阻塞

## Non-goals

- 不换意图识别主模型（仍 deepseek-v4-flash 文本模型）
- 不做图片内容的多轮对话问答（caption 一次性生成，不做 VQA）
- 不缓存/去重 caption（uuid 文件名天然唯一，重复上传即重新生成）
- 不涉及 out_scope 能力（外部平台数据、竞品分析等）
