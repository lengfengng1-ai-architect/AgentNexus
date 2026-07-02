## Why

新增意图识别能力后，需要一个可交互的前端入口让产品和开发快速验证 `chat_pipeline` 工作流对不同输入的识别结果。当前前端只有品牌需求录入的对话流程，无法直接查看 `intent_recognition` Agent 的结构化输出（意图、置信度、回复、品牌输入）。本 change 在现有前端中增加一个轻量的「意图测试」入口，作为后续对话界面优化的第一步。

## What Changes

- 在 `frontend/src/pages/ChatPreviewPage.tsx` 增加对话 / 意图测试两个视图切换。
- 新增 `frontend/src/pages/IntentTestPage.tsx`：一个输入框 + 运行按钮，调用 `POST /api/v1/workflows/chat_pipeline/run`，渲染 `outputs.intent` 的结构化结果。
- 新增 `frontend/src/api/workflow.ts`：封装工作流运行 API，统一错误处理。
- 新增 `frontend/src/types/workflow.ts`：工作流请求/响应类型定义。
- 调整 `frontend/src/App.tsx` 或 `ChatPreviewPage` 的路由/切换逻辑，保留现有聊天流程不变。
- 本次仅做最小可用界面，后续 change 会基于该入口优化交互并融入主对话流。

## Capabilities

### New Capabilities
- `intent-test-frontend`: 前端意图识别测试入口，支持输入消息并展示工作流返回的意图识别结果。

### Modified Capabilities
- 无（本 change 只新增前端调试入口，不改现有后端 API 契约或 Agent 行为）。

## Impact

- 前端：`frontend/src/pages/ChatPreviewPage.tsx`、`frontend/src/api/workflow.ts`（新增）、`frontend/src/types/workflow.ts`（新增）、`frontend/src/pages/IntentTestPage.tsx`（新增）。
- 后端：无改动，仅复用已有 `POST /api/v1/workflows/chat_pipeline/run`。
- 依赖：无新增 npm 包。
- 数据：所有意图结果来自后端 Agent/mock，前端不做 LLM 生成。
