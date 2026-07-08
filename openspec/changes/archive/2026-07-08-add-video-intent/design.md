## Context

当前意图识别只支持 `generate_plan | query_data | chat | clarify | update_context`，图生视频只能通过独立测试页 `/video-test` 访问。需要在聊天对话中支持用户上传图片 → 识别为图生视频意图 → 生成视频 → 对话内展示结果。

## Goals / Non-Goals

**Goals:**
- 意图识别新增 `generate_video` 意图
- 缺失图片参数时走反问逻辑（类似 clarify）
- 前端 ChatPreviewPage 处理 generate_video：状态机气泡 + 后台消费 `/video/generate` SSE
- 零新增后端接口

**Non-Goals:**
- 文生视频意图（T2V）— 后续再做
- 视频生成完成后的推送通知
- 图片上传功能本身（前端已有能力，本设计只处理 URL 来源）

## Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| 意图分发 | chat router 不做路由，只推送 intent event | 保持 `/chat/stream` 单一职责，零后端变更 |
| SSE 消费 | 前端隐式 Promise 消费 `/video/generate` | 不阻塞聊天流，视频气泡独立更新 |
| 反问逻辑 | 走 `missing_fields: ["image_url"]` 机制 | 与 clarify 模式一致，复用现有逻辑 |
| 图片来源 | 附件元数据传递，不从文本解析 | 行业标准 UX，非本设计范围 |

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 前端 SSE 消费与聊天流并发管理 | 隐式 Promise + 独立气泡状态机，不共享状态 |
| generate_video 误识别（用户提到"视频"但不一定是图生视频） | prompt 中加判断规则：必须有图片附件或明确提及"用这张图" |
