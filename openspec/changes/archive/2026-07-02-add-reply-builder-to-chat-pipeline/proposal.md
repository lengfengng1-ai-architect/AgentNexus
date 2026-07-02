## Why

当前主对话 tab 仍调用独立的 `/api/v1/chat` 接口，无法利用已建成的 `chat_pipeline` 工作流中的意图识别与数据查询能力。为了让用户在对话中自然感知系统理解了他的意图，需要在 `chat_pipeline` 末尾增加一个 `reply_builder` 节点，统一生成带意图说明的口语化回复，并由前端主对话直接调用该工作流。

## What Changes

- 在 `chat_pipeline` 工作流末尾新增 `reply_builder` 节点，作为所有分支的统一收口。
- 新增 `backend/app/agents/reply_builder_agent.py`，使用 LLM 把意图识别结果、`brand_input` 以及下游节点输出包装成一句自然语言回复。
- 新增 prompt 模板 `backend/app/prompt_templates/reply_builder.md.j2`，控制回复语气为口语化。
- 修改 `backend/workflows/chat_pipeline.yaml`，增加 `reply_builder` 节点和边。
- 修改 `frontend/src/hooks/useChat.ts`，把 `sendChatMessage` 替换为调用 `runChatPipeline`。
- 调整 `frontend/src/types/chat.ts` 和 `ChatMessage` 类型，支持保存结构化意图结果与品牌字段。
- `frontend/src/components/ProgressTrack.tsx` 继续展示最新 `brand_input`，无需大改。

## Capabilities

### New Capabilities
- `reply-builder`: 在工作流末尾根据意图识别结果和下游节点输出生成自然语言回复。

### Modified Capabilities
- `workflow-orchestration`: 在现有 `chat_pipeline` 中增加新节点，扩展工作流定义能力（节点作为统一回复收口）。
- `chat-preview-frontend`: 主对话流程改为调用 `chat_pipeline` 工作流，并展示 `reply_builder` 返回的口语化回复。

## Impact

- 后端：`backend/app/agents/reply_builder_agent.py`（新建）、`backend/app/prompt_templates/reply_builder.md.j2`（新建）、`backend/workflows/chat_pipeline.yaml`（修改）。
- 前端：`frontend/src/hooks/useChat.ts`（修改）、`frontend/src/api/workflow.ts`（复用）、`frontend/src/types/chat.ts`（可能扩展）。
- API：复用 `POST /api/v1/workflows/chat_pipeline/run`，不新增端点。
- 不影响已完成的「意图测试」tab。
