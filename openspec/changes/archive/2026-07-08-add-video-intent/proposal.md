## Why

当前意图识别只支持 5 种意图（`generate_plan | query_data | chat | clarify | update_context`），图生视频只能通过独立测试页访问，无法在对话流程中自然触发。用户需要在聊天中上传图片 → 识别为图生视频意图 → 生成视频 → 对话内直接展示结果。

## What Changes

- **意图识别 Schema**：`IntentRecognitionOutput.intent` 新增 `generate_video` 枚举值
- **意图识别 Prompt**：在 `intent_recognition.md.j2` 中新增 `generate_video` 的判断规则和输出格式
- **前端 ChatPreviewPage**：处理 `generate_video` intent，展示状态机气泡 + 后台消费 `/video/generate` SSE
- **零新增后端接口**：复用 `/chat/stream`（识别意图）和 `/video/generate`（后台消费 SSE）

## Capabilities

### New Capabilities
无

### Modified Capabilities
- `workflow-orchestration`（意图识别）：新增 `generate_video` 意图，支持视频生成意图的识别与反问

## Impact

| 影响范围 | 具体内容 |
|---------|---------|
| `schemas/intent.py` | intent pattern 增加 `generate_video` |
| `prompt_templates/intent_recognition.md.j2` | 新增意图判断规则 |
| `frontend/src/pages/ChatPreviewPage.tsx` | 处理 generate_video 气泡展示 + SSE 消费 |
| `frontend/src/api/workflow.ts` | IntentResult type 增加 generate_video |
| 测试 | 新增 generate_video 意图识别测试 |
