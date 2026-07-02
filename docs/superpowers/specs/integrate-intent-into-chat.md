# 设计草稿：在对话流程中集成意图识别

## 背景

当前 `ChatPreviewPage` 有两个 tab：
- **对话**：调用 `/api/v1/chat`（`sendChatMessage`），返回 `{reply, brand_input, is_complete}`，走独立聊天接口。
- **意图测试**：调用 `/api/v1/workflows/chat_pipeline/run`，返回结构化意图识别结果 `outputs.intent`，用于开发调试。

用户希望主对话也具备意图识别能力，并在 AI 回复中自然体现识别结果，而不是只在测试入口里展示。

## 目标

让主对话流程改为调用 `chat_pipeline` 工作流，并在 AI 回复里附带一句自然语言说明，让用户感知到系统识别到了什么意图、提取到了哪些关键字段。

## 产品细节（已确认）

1. **回复来源**：使用 `chat_pipeline` 工作流输出。当前工作流返回 `outputs.intent.reply` 和 `outputs.end_reply.reply`；需确定以哪个为主，或组合展示。
2. **意图展示形式**：在 AI 回复中自然语言体现，例如：
   - "我理解为：您想生成营销方案（Nike、上海、预算 50 万、周期 3 个月）。"
   - 不需要额外标签或结构化面板，先以文本形式存在。
3. **brand_input 处理**：继续使用现有 `ProgressTrack` 展示最新品牌字段。工作流返回的 `intent.brand_input` 已经是结构化字段，可直接映射到 `ProgressTrack`。
4. **保留「意图测试」tab**：保留现有测试入口，便于后续迭代调试。
5. **后端可扩展**：可以新增一个专门面向对话的 node/workflow，参考成熟产品做法。

## 业界参考

根据 FuseLab 的 Chatbot UI Design Patterns 指南，意图识别在对话中的展示建议包括：

- **澄清性问题**：当置信度不足时，提供 2-4 个聚焦选项，而不是猜测。
- **快速回复按钮**：引导用户进入支持的任务范围，减少歧义。
- **能力透明**：开场即展示三个典型示例查询，让用户在 5 秒内知道 bot 能做什么。
- **渐进式披露**：第一层用视觉提示展示置信度；第二层可展开解释为何这样理解；第三层提供完整推理链路。
- **错误恢复**：Stardog Voicebox 的做法是把不明确的查询重定向到结构化查询建议，而不是简单的"我没听懂"。

参考来源：
- [Chatbot UI Design Patterns and Best Practices 2026](https://fuselabcreative.com/chatbot-interface-design-guide/)
- [AI Intent Recognition for Chatbots: How It Works in 2026](https://irisagent.com/blog/building-chatbots-with-intent-detection-guide/)
- [Chatbot UX Design Best Practices for 2026](https://viston.tech/chatbot-ux-design-best-practices-for-2026-building-ai-assistants-users-actually-trust/)

## 候选方案

### 方案 A：前端直接切换 API（最小改动）

- 修改 `useChat.ts`，把 `sendChatMessage` 替换为调用 `runChatPipeline`。
- 在 `RECEIVE_MESSAGE` action 中，把工作流输出转成对话消息格式。
- AI 回复内容优先取 `outputs.end_reply.reply`，如果没有则取 `outputs.intent.reply`。
- 在回复末尾追加一句自然语言意图说明：
  - "[识别到意图：generate_plan，品牌：Nike，城市：上海，预算：50万，周期：3个月]"
- 优点：改动小，可快速验证。
- 缺点：意图说明和主回复是前端拼接，略显生硬；后端对工作流输出没有语义控制。

### 方案 B：后端新增「对话回复生成」节点

- 在 `chat_pipeline` 末尾新增一个 `reply_builder` 节点，负责把 `intent` 输出包装成自然语言回复。
- 该节点接收 `intent` 和 `brand_input`，输出 `{reply, intent_summary}`。
- 前端直接展示 `reply_builder.reply`，无需拼接。
- 优点：文案策略由后端控制，便于调整语气和内容。
- 缺点：需要新增后端节点和 prompt 模板，改动稍大。

### 方案 C：保留现有 `/chat` 接口，后端内部调用工作流

- 不改动前端调用的接口，仍然调用 `POST /chat`。
- 后端 `/chat` handler 内部调用 orchestrator 运行 `chat_pipeline`，再把工作流输出包装成旧的响应格式。
- 前端几乎不变，只需在消息里展示 `reply`。
- 优点：兼容现有前端代码，不暴露工作流细节。
- 缺点：没有直接展示意图识别结果，需要额外扩展响应字段。

## 推荐方向

短期采用 **方案 A** 快速验证：前端改 `useChat` 调用工作流，并简单拼接意图说明。等用户确认体验后，再考虑 **方案 B** 把回复生成移到后端节点。

## 需要进一步明确的点

1. AI 回复内容优先取 `outputs.end_reply.reply` 还是 `outputs.intent.reply`？
2. 意图说明的文案风格：正式、口语化、还是带 emoji？
3. 是否需要在 `ChatMessage` 类型里新增 `intent` 字段，保存结构化意图结果？
4. 工作流返回的 `brand_input` 字段与现有 `/chat` 接口是否完全兼容（如 `category` 在 intent 里可能为空字符串）？

## 相关文件

- `frontend/src/hooks/useChat.ts`
- `frontend/src/api/workflow.ts`
- `frontend/src/types/workflow.ts`
- `frontend/src/components/ChatContainer.tsx`
- `frontend/src/components/ChatBubble.tsx`
- `backend/app/routers/chat.py`
- `backend/app/agents/chat_extraction_agent.py`
- `backend/app/agents/intent_recognition_agent.py`
- `backend/workflows/chat_pipeline.yaml`

---

下一步：基于本设计草稿进入 `/opsx:explore` 流程，确认方案细节并生成正式 OpenSpec artifacts。
