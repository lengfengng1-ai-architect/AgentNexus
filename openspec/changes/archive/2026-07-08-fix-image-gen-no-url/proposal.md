## Why

`POST /api/v1/image/generate` 返回 200 OK 但响应体中没有 `image_url`。Qwen-Image 2.0 Pro 的响应格式可能不是代码中硬编码的 `output.choices[0].message.content[0].image` 路径（如返回 `results` 数组、`image` 字段为空、或结构不同），导致 `call_qwen_image_api` 返回空 URL 或抛异常，前端 InlineImageCard 收不到图片 URL。

此外，对于用户已提供详细 Prompt 的场景（如 text_to_image），`run_image_generation` 多走了一步 LLM 重写 Prompt，不仅浪费时间（~7s），还可能因中文化改写丢失英文专业摄影术语的精度。

## What Changes

- **`call_qwen_image_api` 增加容错解析**：支持 `results[0].url` 和 `output.results[0].url` 等多种格式，解析不到时报错而非返回空串
- **`run_image_generation` 添加绕过 LLM 重写的逻辑**：当传入的 `plan_content` 长度 < 500 且包含详细视觉描述时，直接用作 Qwen-Image Prompt，跳过 LLM 重写
- **响应体增加 `image_url` 非空校验**：`ImageGenerateData.image_url` 为空时返回错误而非成功
- **后端增加 DEBUG 日志**：输出 Qwen-Image API 的原始响应结构，便于后续排查

## Capabilities

### New Capabilities
- 无新 capability

### Modified Capabilities
- 无 spec 级别变化（纯实现 bug 修复）

## Impact

- **Backend**: `app/agents/image_generation_agent.py`（`call_qwen_image_api` 解析逻辑 + `run_image_generation` 跳过 LLM 逻辑）
- **Backend**: `app/routers/image_generation.py`（新增空 URL 校验）
- **Backend**: 不涉及 API 契约变化
- **Frontend**: 无改动
