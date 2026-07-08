## Context

`call_qwen_image_api` 是图片生成的核心函数，负责调用 Qwen-Image 2.0 Pro API。当前代码硬编码了解析路径 `output.choices[0].message.content[0].image`，但 DashScope API 响应格式存在以下变体：

- **标准格式**：`output.choices[0].message.content[0].image`
- **Results 格式**：`output.results[0].url`（部分模型/版本）
- **空内容**：`content[0]` 有 `text` 但无 `image` 字段（内容过滤或异常时）

当前 `except (KeyError, IndexError)` 捕获并抛出 RuntimeError，但异常被 `image_generate` 路由的 `except Exception` 捕获后返回 200 + `success=false`。

另外，`run_image_generation` 的设计初衷是从营销方案文本（3000+ chars）生成配图。对于 InlineImageCard 的 text_to_image 场景，用户输入已经是专业英文摄影 Prompt（如 5-shot 产品摄影表格），LLM 重写反而降低了精度，且耗时 ~7s。

## Goals / Non-Goals

**Goals:**
- 解析 Qwen-Image API 多种响应格式，保障 `image_url` 能被正确提取
- 空 `image_url` 时返回错误，不返回假成功的响应
- 对于已经是详细视觉描述的用户输入，跳过 LLM 重写
- 添加 API 响应结构的 DEBUG 日志便于后续排查

**Non-Goals:**
- 不修改 API 接口契约（请求/响应格式不变）
- 不修改 InlineImageCard 前端代码
- 不做图片上传/缓存/代理

## Decisions

### 决策 1：容错解析优先尝试 multi-format

按优先级依次尝试：
1. `output.choices[0].message.content[0].image`（原始格式）
2. `output.results[0].url`（results 格式）
3. 全量遍历 `output.choices` / `output.results` 查找含 `image` 或 `url` 的项

全部失败则报错，附带完整 response body 用于调试。

### 决策 2：根据 plan_content 判断是否跳过 LLM

判断条件：`plan_content` 包含 "Image Prompt"、"product photography"、"--ar" 等英文摄影 Prompt 关键词，或 `len(plan_content) > 300` 且包含详细视觉词汇（"commercial product photography"、"shot"、"lighting" 等）。满足条件时直接用 `plan_content` 作为 Qwen-Image prompt，跳过 `generate_image_prompt`。

### 决策 3：Router 层加固空 URL 校验

`ImageGenerateData` 的 `image_url` 返回前校验 `result["image_url"]` 非空，为空时返回 `success=false` + `error`。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| LLM 跳过逻辑误判（该跳的不跳/不该跳的跳） | 用关键词匹配，偏向保守（优先跳过长+含摄影术语的输入） |
| Qwen-Image API 再出新格式 | `call_qwen_image_api` 最后兜底抛出完整 response，用户可凭日志快速定位 |
