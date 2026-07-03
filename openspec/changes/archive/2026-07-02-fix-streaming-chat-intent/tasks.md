## 1. 后端：改造 intent_recognition 支持流式输出

- [x] 1.1 在 `intent_recognition_agent.py` 中新增 `async def stream_intent_recognition(state: dict) -> AsyncGenerator[tuple[str, dict | None], None]`，逐 chunk yield `(reasoning_chunk, None)`，最后 yield `("", intent_dict)`
- [x] 1.2 确保 `enable_thinking=True` 时流式输出 `reasoning_content`，`enable_thinking=False` 时直接 yield 完整结果
- [x] 1.3 新增 `backend/app/schemas/chat_stream.py`：定义 SSE 事件类型 `StreamEvent`（reasoning/intent/done）
  - ponytail: 未额外建 schema 文件，直接在 chat.py 中用字符串 SSE 格式，已在后端产生标准 event/reasoning 和 event/intent 事件

## 2. 后端：重写 /chat/stream 端点

- [x] 2.1 重写 `chat_stream()` 路由，改为调用 `stream_intent_recognition`，流式输出 `event: reasoning`（推理片段）和 `event: intent`（完整 JSON，含 intent/reply/brand_input/missing_fields）
- [x] 2.2 `/chat/stream` 接收可选参数 `context: dict`，用于传递已积累的 brand_input（多轮对话上下文）
- [x] 2.3 更新 `docs/api/paths/intent.yaml` 反映新增的 `context` 参数和 SSE 事件格式

## 3. 后端：删除 reply_builder

- [x] 3.1 删除 `backend/app/agents/reply_builder_agent.py`
- [x] 3.2 删除 `backend/app/schemas/reply_builder.py`
- [x] 3.3 删除 `backend/app/prompt_templates/reply_builder.md.j2`
- [x] 3.4 删除 `backend/workflows/chat_pipeline.yaml`
- [x] 3.5 从 `backend/app/agents/__init__.py` 移除 reply_builder import
- [x] 3.6 清理 `backend/app/services/chat_service.py` 中引用 reply_builder 的代码（如有）
- [x] 3.7 更新 `openspec/specs/reply-builder/spec.md` 标记为废弃（已在主 spec 中）

## 4. 前端：streamChat 支持 intent 事件

- [x] 4.1 在 `workflow.ts` 的 `StreamChunk` 类型中新增 `intent?: IntentRecognitionResult`
- [x] 4.2 `parseEventBlock` 解析 `event: intent` 事件，返回完整 intent JSON
- [x] 4.3 导出 `streamChat` 生成的 chunk 包含 `intent` 字段

## 5. 前端：useChat intent 分流

- [x] 5.1 在 `ChatMessage` 类型中新增 `intent?: string`、`brandInput?: BrandInput`、`missingFields?: string[]` 字段
- [x] 5.2 `chatReducer` 新增 `INTENT_RECEIVED` action，存储 intent 相关信息到消息中
- [x] 5.3 `sendMessage` 在收到 `intent` 事件后 dispatch `INTENT_RECEIVED`，不再等待 `reply` 事件
- [x] 5.4 `sendMessage` 支持传入 `context?: { brand_input: BrandInput }` 参数，积累多轮上下文
- [x] 5.5 `retryMessage` 同样支持 intent 分流

## 6. 前端：ChatBubble intent 渲染

- [x] 6.1 `ChatBubble` 根据 `message.intent` 渲染不同 UI：
  - `generate_plan`：显示 reply + "确认生成方案"按钮
  - `clarify`：显示 reply（追问文案）
  - `chat`/`query_data`/`update_context`：显示 reply
- [x] 6.2 "确认生成方案"按钮点击 → 调用 `onGeneratePlan(message.brandInput)` 回调
- [ ] 6.3 `update_context` 时高亮显示更新字段（非关键，可后续优化）

## 7. 前端：ChatContainer 多轮对话闭环

- [x] 7.1 `ChatContainer` 维护上下文，每次收到 `intent` 事件时通过 latestBrandInput 跟踪最新状态
- [x] 7.2 `sendMessage` 时始终携带当前 `brandInput` 作为 context（通过 `messagesRef`）
- [x] 7.3 `clarify` 时继续等待用户输入（无特殊 UI 变化）
- [x] 7.4 `generate_plan` 且用户确认时：执行 `onGeneratePlan(brandInput)` → 跳转 `/plan?brandInput=...`

## 8. 前端：工作台自动启动

- [x] 8.1 `PlanPage` 从 URL query string 解析 `brandInput` 后立即自动填充表单
- [x] 8.2 表单填充后自动启动 pipeline（不再需要用户手动点击）

## 9. 测试与验证

- [x] 9.1 后端测试：`test_chat.py` 覆盖 SSE 流式输出事件格式（reasoning/intent/done）
- [x] 9.2 后端测试：验证 context 参数传递（多轮上下文）
- [x] 9.3 清理已删除 reply_builder 的测试文件
- [x] 9.4 前端测试：验证 `streamChat` 解析 `event: intent`
- [x] 9.5 前端测试：验证 `useChat` 在收到 intent 事件后的状态
- [x] 9.6 运行 `cd backend && uv run pytest --cov=app --cov-report=term-missing` 确认 ≥80%
