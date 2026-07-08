## 1. 后端 — Schema + Prompt + Agent

- [x] 1.1 `schemas/intent.py` — intent pattern 增加 `text_to_video | text_to_image` + 新增 `generation_prompt` 字段
- [x] 1.2 `intent_recognition.md.j2` — prompt 模板新增 `text_to_video` / `text_to_image` 判断规则和输出格式（generation_prompt）
- [x] 1.3 `intent_recognition_agent.py` — `_normalize_intent_output` 增加 T2V/T2I 处理（排除 normalize 约束）

## 2. 前端 — 类型 + ChatBubble 导航 + 跳转逻辑

- [x] 2.1 `workflow.ts` / `chat.ts` — IntentResult/ChatMessage 类型增加 `text_to_video | text_to_image` 枚举和 `generationPrompt` 字段
- [x] 2.2 `ChatBubble.tsx` — 生成类意图显示导航按钮（生成视频/生成图片），移除 VideoBubble 内嵌渲染
- [x] 2.3 `ChatContainer.tsx` — 处理导航按钮点击，navigate 到 `/video-test` 或 `/image-test` 携带 `prompt` / `image_url` query params
- [x] 2.4 `useChat.ts` — 简化 `generate_video` 处理，移除 `consumeVideoGeneration` 等内嵌 SSE 消费逻辑

## 3. Test Page 自触发

- [x] 3.1 `ImageTestPage.tsx` — mount 时读取 query params，有 `prompt` 时自动触发生成
- [x] 3.2 `VideoTestPage.tsx` — mount 时读取 query params，有 `prompt` 时自动触发生成（兼容 T2V 无 image_url 和 I2V 有 image_url）

## 4. 测试

- [x] 4.1 意图识别测试：`text_to_video` 意图正确性 + generation_prompt 提取
- [x] 4.2 意图识别测试：`text_to_image` 意图正确性 + generation_prompt 提取
- [x] 4.3 意图识别测试：`generate_video` 缺图反问保持正确

## 5. 文档

- [x] 5.1 同步主 spec：`openspec/specs/intent-recognition/spec.md`
- [x] 5.2 同步主 spec：`openspec/specs/video-generation/spec.md`
- [x] 5.3 更新 `docs/api/paths/intent.yaml` — intent 枚举添加 text_to_video / text_to_image
