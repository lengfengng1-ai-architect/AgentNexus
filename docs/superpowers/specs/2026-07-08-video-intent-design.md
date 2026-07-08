# 意图识别新增 `generate_video` — 图生视频意图

## 背景

当前意图识别只支持 5 种意图（`generate_plan | query_data | chat | clarify | update_context`），图生视频只能通过独立测试页 `/video-test` 访问，无法在对话流程中触发。

## 目标

在对话中输入图片+文字，意图识别能识别"图生视频"意图，异步生成视频并在聊天气泡中展示。

## 非目标

- 图片上传功能本身（只设计意图识别和路由）
- T2V（文生视频）意图（未来再扩展）
- 视频生成完成后的推送通知

## 设计

### 新增意图

在 `IntentRecognitionOutput.intent` 中新增 `generate_video`：
- `"generate_video"` — 用户意图是生成视频

### 反问逻辑

当 `intent=generate_video` 但 `image_url` 缺失时，返回 `generate_video` + `missing_fields: ["image_url"]`，前端气泡显示反问消息（"请提供需要生成视频的图片"）。

### 交互流程

```
用户上传图片 + 输入文字
        │
        ▼
  /chat/stream → 意图识别 → generate_video
        │
        │  event: intent 返回：
        │  { intent: "generate_video", image_url: "…" }
        │
        ▼
  聊天气泡显示 "⌛ 正在生成视频…"
        │
        │  前端后台消费 /video/generate SSE：
        │    progress(task_created) → ⌛ 排队中
        │    progress(polling, 45%) → ████ 45% 已等60s
        │    progress(completed)    → ▶ 视频播放器
        │    error                  → ⛔ 失败信息
        │
        ▼
  聊天记录中永久保留视频结果
```

### 架构变更

| 层 | 变更 |
|---|------|
| `schemas/intent.py` | intent pattern 加 `generate_video` |
| `prompt_templates/intent_recognition.md.j2` | prompt 加 generate_video 意图判断规则 |
| `frontend/src/api/workflow.ts` | IntentResult type 加 generate_video |
| `frontend/src/pages/ChatPreviewPage.tsx` | 处理 generate_video intent：展示状态机气泡 + 后台调 /video/generate SSE |

### 零新增后端接口

- `/chat/stream` 不做改变，只推送 intent event
- `/video/generate` 的 SSE 在后台消费（隐式 Promise），不阻塞聊气流

### 测试

- 意图识别单元测试：`generate_video` 意图识别 + 反问场景
- ChatPreviewPage 手动验证：图片附件 → 生成视频 → 气泡展示

## 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 意图处理 | 新增 generate_video，不重用 existing | generate_plan 语义不同（视频 vs 营销方案） |
| 反问 | 走 missing_fields 机制 | 与 clarify 模式一致，复用现有逻辑 |
| SSE 消费 | 前端后台隐式消费 | 零后端改动，最小变更 |
| 图片附件 | 元数据传给 intent | 不从文本解析 URL，UX 可靠 |
