## 1. Qwen-Image API 响应解析容错

- [x] 1.1 `call_qwen_image_api` 增加多格式解析：按优先级尝试 `choices[0].message.content[0].image` → `results[0].url` → 全量遍历查找含 image/url 的项
- [x] 1.2 全部格式都解析不到时，抛出含完整 response body 的 RuntimeError
- [x] 1.3 添加 DEBUG 日志：在解析前打印 raw response 的 key 结构（`result.get("output", {}).keys()`）

## 2. 跳过 LLM Prompt 重写

- [x] 2.1 `run_image_generation` 增加判断逻辑：plan_content 包含摄影 Prompt 关键词（"Image Prompt"、"--ar"、"product photography" 等）或包含详细视觉描述时，直接用 plan_content 作为 Qwen-Image prompt，跳过 `generate_image_prompt`
- [x] 2.2 INFO 日志标记是否跳过 LLM 重写（"直接使用用户输入作为 image prompt" / "已生成 image prompt"）

## 3. Router 层空 URL 校验

- [x] 3.1 `image_generate` 路由在构造函数 `ImageGenerateData` 前检查 `image_url` 非空，为空则返回 `success=false` + `BAD_REQUEST` 错误
- [x] 3.2 测试通过：`cd frontend && npx tsc --noEmit` + `cd backend && uv run pytest`
