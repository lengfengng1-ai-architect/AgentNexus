## Why

当前 `/chat/stream` 端点直接调用 LLM 回复用户，跳过了 intent_recognition agent。聊天没有意图识别，无法判断用户是想生成方案、查数据还是闲聊，也无法积累多轮对话中收集的品牌信息。用户需要输入完整信息才能跳转工作台，体验断裂。

## What Changes

1. **改造 `/chat/stream`**：不再直调 LLM，改为调用 `intent_recognition_agent`，流式输出推理过程，最终输出结构化 JSON（intent/brand_input/reply/missing_fields）
2. **前端 `streamChat` 支持 intent 事件**：新增 `event: intent` 解析，返回完整 intent JSON
3. **前端 `useChat` 根据 intent 分流**：
   - `generate_plan` → 确认生成方案卡片
   - `clarify` → 显示 agent 追问，等待用户继续输入
   - `chat`/`query_data`/`update_context` → 直接显示回复
4. **多轮上下文保留**：brand_input 在对话中累积，每次调用携带已有信息
5. **确认卡片 → 跳转工作台**：用户确认后携带 brand_input 跳转 `/plan`
6. **删除 `reply_builder`**（不再需要，intent 自带 reply 已够用）

## Capabilities

### Modified Capabilities

- `brand-input`: 需求采集从单轮改为多轮对话式，intent_recognition 支持 `clarify` 追问循环
- `plan-generation`: 方案触发流程改为 聊天确认 → 跳转工作台 → 自动生成

## Impact

- **后端**：重写 `backend/app/routers/chat.py`，修改 `backend/app/agents/intent_recognition_agent.py`（暴露思考流）
- **前端**：修改 `frontend/src/api/workflow.ts`（streamChat 解析 intent 事件）、`frontend/src/hooks/useChat.ts`（intent 分流）、`frontend/src/components/ChatBubble.tsx`（确认卡片）
- **可删除**：`reply_builder_agent.py` 及其 prompt 模板、schemas、workflow 节点
