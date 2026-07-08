## 1. 后端 — Schema + Prompt

- [x] 1.1 `schemas/intent.py` — IntentRecognitionOutput.intent pattern 增加 `generate_video`
- [x] 1.2 `intent_recognition.md.j2` — prompt 模板新增 `generate_video` 意图判断规则和输出格式

## 2. 前端 — ChatPreviewPage 视频意图处理

- [x] 2.1 `workflow.ts` — IntentResult type 增加 `generate_video` 枚举
- [x] 2.2 `ChatPreviewPage.tsx` — 处理 `generate_video` intent：状态机气泡 + 后台消费 `/video/generate` SSE

## 3. 测试

- [x] 3.1 意图识别测试：`generate_video` 意图识别正确性
- [x] 3.2 意图识别测试：`generate_video` 缺图反问场景

## 4. 文档

- [x] 4.1 同步主 spec：`openspec/specs/intent-recognition/spec.md` 添加 generate_video
- [x] 4.2 更新 `docs/api/paths/intent.yaml` — intent 枚举添加 generate_video
