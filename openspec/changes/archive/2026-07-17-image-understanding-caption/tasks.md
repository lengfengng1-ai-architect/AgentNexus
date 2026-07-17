# Tasks: image-understanding-caption

## 1. OpenAPI 契约（先行）

- [x] 1.1 `docs/api/paths/upload.yaml`：`UploadFileItem` 新增 `caption: string | null` 字段（中文 description：视觉模型生成的图片描述，非图片或生成失败时为 null）
- [x] 1.2 新增 `docs/api/paths/prompt-optimizer.yaml`：覆盖 `/prompt/optimize` 现状（prompt/type 必填）+ 新增可选 `image_context`（string, max 500，参考图片内容描述）

## 2. 后端 caption 服务与上传接线

- [x] 2.1 新增 `backend/app/services/image_caption.py`：`async def generate_caption(image_path: Path) -> str | None`——qwen-vl-plus（OpenAI 兼容模式，复用 dashscope key/base_url），图片经 `to_data_uri()` 内联；prompt 约束 1-2 句客观中文描述、禁编造品牌名；5s 超时 + 异常降级 null + warning 日志
- [x] 2.2 `backend/app/schemas/upload.py`：`UploadFileItem` 加 `caption: str | None`
- [x] 2.3 `backend/app/routers/upload.py`：图片文件（mime image/*）保存后 `asyncio.gather` 并发生成 caption 填入响应；非图片跳过
- [x] 2.4 测试 `backend/tests/test_services/test_image_caption.py` + `test_routers/test_upload.py`：mock VL 响应覆盖 成功/超时/错误/非图片 四类

## 3. 意图识别消费 caption

- [x] 3.1 `intent_recognition_agent.py`：`_load_system_prompt` 透传 `image_captions` 到 clean_ctx
- [x] 3.2 `intent_recognition.md.j2`：新增「附件图片描述」区块；generate_video/text_to_image 规则补充 caption 结合预填（措辞按 design D5，人可改写）
- [x] 3.3 测试：上传图+无描述文字 → video_prompt/generation_prompt 非空且含主体信息；无 caption 行为不变

## 4. prompt 优化接口

- [x] 4.1 `routers/prompt_optimizer.py` + `services/prompt_optimizer.py`：请求体/service 加可选 `image_context`（max 500）
- [x] 4.2 `prompt_optimizer.md.j2`：渲染「参考图片内容」（有值时）
- [x] 4.3 测试：带 image_context 调用 → prompt 包含参考内容；不带 → 行为不变

## 5. 前端接线

- [x] 5.1 `types/chat.ts`：`ChatMessage` 加 `imageCaptions?: string[]`；`ScreenChat.tsx` 上传响应存 captions 到消息
- [x] 5.2 `useChat.ts`：`getLatestImageCaptions`（复刻 getLatestImageUrls 模式）+ context 组装 `image_captions`（本轮优先否则跨轮延续）
- [x] 5.3 `api/promptOptimizer.ts`：`optimizePrompt` 加可选第三参 `imageContext`；`InlineImageCard`/`InlineVideoCard` 从 message 取第一张图 caption 传入（props 加 `imageCaption?: string | null`，ChatBubble 透传）

## 6. 验证

- [x] 6.1 后端 pytest 全绿（新增 + 既有 intent/upload 测试）
- [x] 6.2 `tsc --noEmit` 通过
- [x] 6.3 浏览器预览：上传跑鞋图 → 选择"产品宣传短片" → 视频卡描述预填含跑鞋信息；点 AI 优化结果与图相关；上传 PDF → caption 为 null 不报错
- [x] 6.4 code-reviewer 审查改动文件
