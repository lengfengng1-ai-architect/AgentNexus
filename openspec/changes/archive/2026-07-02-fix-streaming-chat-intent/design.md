## Context

当前 `POST /chat/stream` 端点直接调用 LLM 回复用户，完全跳过了 intent_recognition agent。前端的 `useChat.ts` 只做简单的流式显示，没有根据 intent 做任何分流。需要把整个聊天流程接回到已有的 intent_recognition → 分支路由 → 回复 这个架构上。

同时 `reply_builder` 节点已经不再需要——intent_recognition 的 `reply` 字段本身就是一条完整的自然语言回复，多一次 LLM 调用是浪费。

## Goals / Non-Goals

**Goals:**
- `POST /chat/stream` 走 intent_recognition agent，流式输出思考过程 + 最终 JSON
- 前端 `useChat.ts` 根据 intent 分流处理
- 支持多轮对话补材料（clarify → 用户补充 → 再见 intent_recognition）
- generate_plan 时显示确认卡片，用户确认后跳转 `/plan`
- 工作台自动用 brand_input 启动 pipeline
- 删除 reply_builder 及其相关代码（agent、schema、prompt、workflow 节点、chat_pipeline）

**Non-Goals:**
- 不改变工作台内部逻辑（只改触发方式）
- 不做前端状态持久化（localStorage 已有）

## Decisions

### 1. `/chat/stream` 改为调用 intent_recognition_agent

**方案**：不再直调 LLM，改为在 `chat_stream()` 中调用 `run_intent_recognition()`，将其 `reasoning` 作为 SSE `event: reasoning` 流式输出，最终输出 `event: intent` 携带完整 JSON。

**为什么不用 `chat_pipeline` workflow**：chat_pipeline 包含 extract/data_query/end_reply/reply_builder 等节点，但我们现在只需要 intent_recognition + 前端分流。走完整 workflow 延迟高，且产生大量不需要的中间输出。直接调 intent_recognition agent 函数即可。

**思考过程流式输出方式**：intent_recognition_agent 已经支持 `enable_thinking=True`，返回 `reasoning_content`。改造后暴露 `async def stream_intent_recognition()`，逐 chunk yield `(reasoning_chunk, final_json)`。

### 2. 前端事件协议扩展

现有事件：`event: reasoning`、`event: reply`、`event: done`
新增事件：`event: intent`（携带完整 IntentRecognitionOutput JSON）

当收到 `event: intent` 时，前端不再继续等 `event: reply`，而是根据 `intent.intent` 字段做分流。

### 3. 前端 intent 分流机制

`useChat` 新增 `intent` 字段到 ChatMessage，`ChatBubble` 根据 `intent` 渲染不同 UI：

| intent | 渲染 | 用户操作 |
|---|---|---|
| `generate_plan` | reply + "确认生成方案"按钮 | 点击跳转工作台 |
| `clarify` | reply（追问文案） | 继续输入 |
| `chat` | reply | - |
| `query_data` | reply | - |
| `update_context` | reply + 更新字段高亮 | 继续输入 |

### 4. 删除 reply_builder

`reply_builder_agent.py`、`schemas/reply_builder.py`、`prompt_templates/reply_builder.md.j2`、`tests/test_agents/test_reply_builder.py`、`chat_pipeline.yaml` 中 reply_builder 节点全部删除。`__init__.py` 中移除 import。

## Risks / Trade-offs

1. **[兼容性] 现有 `chat_pipeline` workflow 仍然引用 reply_builder** → 删除 reply_builder 后需要同时更新或废弃 chat_pipeline。因为 chat 不再走 workflow，chat_pipeline 可以整体废弃。
2. **[延迟] intent_recognition 使用 enable_thinking 会先输出推理再输出 JSON** → 这正好是前端需要的"思考中"效果，不是问题。
3. **[上下文累积] 澄清循环中 brand_input 不断增大** → 每次只传需要的字段（brand_input dict），不会无限膨胀。
