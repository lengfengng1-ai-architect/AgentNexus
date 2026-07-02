## Context

当前前端 `ChatPreviewPage` 只承载品牌需求录入的对话流程，通过 `POST /api/v1/chat` 与后端交互。意图识别 Agent 接入 `chat_pipeline` 工作流后，后端已能通过 `POST /api/v1/workflows/chat_pipeline/run` 返回结构化的意图识别结果，但前端缺少一个直接触发和观察该结果的入口。本设计在现有前端中增加一个最小可用的「意图测试」视图，供产品和开发快速验证。

## Goals / Non-Goals

**Goals:**
- 在现有 `ChatPreviewPage` 中提供「对话 / 意图测试」切换，不影响现有聊天流程。
- 意图测试视图支持用户输入消息并调用 `POST /api/v1/workflows/chat_pipeline/run`。
- 渲染工作流返回的 `outputs.intent` 关键字段：intent、confidence、reply、brand_input。
- 保持代码最小化，为后续 change 将意图结果融入主对话流做准备。

**Non-Goals:**
- 不新增后端路由或修改 Agent 行为。
- 不做复杂的会话历史、状态持久化或错误重试。
- 不接入真实 LLM，所有结果来自后端已有服务/mock 数据。
- 不做响应式断点的复杂适配，仅保证桌面和移动端基础可用。

## Decisions

- **复用现有页面切换而非新增路由**：项目目前只有 `App.tsx` → `ChatPreviewPage` 单页面，新增路由需要引入 `react-router` 等依赖。采用页面内 tab 切换成本最低，也符合“先简单后优化”的诉求。
- **新增独立 API 模块 `api/workflow.ts`**：与现有 `api/chat.ts` 平行，避免把 workflow 相关逻辑混入聊天 API，方便后续扩展。
- **类型定义放在 `types/workflow.ts`**：与 `types/chat.ts` 平行，保持领域隔离。
- **展示原始结构化输出**：测试入口的核心价值是让开发者看到 Agent 返回的完整意图结果，因此直接以 JSON/结构化卡片形式展示，不做过度美化。
- **错误处理复用现有模式**：沿用 `api/chat.ts` 的 axios 错误提取方式，统一提示中文错误信息。

## Risks / Trade-offs

- **[Risk] 页面切换增加一点认知负担** → 当前用户主要是开发/产品测试，切换明确标注，影响可控。
- **[Risk] 直接展示 JSON 对非技术用户不友好** → 这是测试入口，后续 change 会优化为主对话流中的隐式展示。
- **[Trade-off] 不复用现有聊天消息组件** → 意图测试需要展示结构化数据而非对话气泡，单独组件更清晰。
