## Context

当前后端已有一个可配置的工作流编排底座（`workflow-orchestration`），`chat_extraction_agent` 是唯一注册的用户输入处理节点。它只做品牌字段提取，无法处理「查询数据」「修改预算」「闲聊」等多样化的用户输入。前端 demo 里已经用正则实现了简单的 `recognizeIntent`，但后端缺少对应的 Agent 化能力。

本次设计新增一个 `intent_recognition` Agent 节点，并扩展编排器支持条件边，使工作流能够根据识别出的意图路由到不同下游节点。

## Goals / Non-Goals

**Goals:**

- 新增 `intent_recognition` Agent 节点，输出统一的意图识别结构。
- 扩展 `WorkflowNode`，支持 `condition` 字段，使用 JSONPath 布尔表达式描述分支条件。
- 扩展 `orchestrator.build_graph`，根据 condition 构建 LangGraph 条件边。
- 新增 `data_query_agent` 节点，处理 `query_data` 意图并返回 mock 数据摘要。
- 新建 `chat_pipeline` 工作流 YAML，串联意图识别、条件分支和下游节点。
- 新增测试覆盖：意图识别 Agent、data_query_agent、条件边构建、chat-pipeline 运行。

**Non-Goals:**

- 不修改前端对话界面。
- 不新增独立的 `/chat` HTTP 端点，复用现有 `/api/v1/workflows/{id}/run`。
- 不引入真实外部数据接入，数据查询继续使用 MVP mock 数据。
- 不实现会话状态持久化，上下文由客户端透传。
- 不实现 out_scope 能力（用户认证、竞品分析、跨平台数据、方案自动执行等）。

## Decisions

### 1. 意图识别 Agent 合并替代 chat_extraction

- **选择**：`intent_recognition` 节点同时完成意图判断和关键字段提取，替代 `chat_extraction` 成为入口节点。
- **理由**：减少一次 LLM 调用，降低延迟；前端 demo 里的 `recognizeIntent` 和 `extractBrandInfo` 本来就是一起做的，合并更符合实际交互。
- **替代方案**：先做 `intent_recognition` 再做 `chat_extraction`（两次 LLM 调用，更模块化但成本更高）。

### 2. 五类意图

- `generate_plan`：用户想生成营销方案。
- `query_data`：用户想查询 AllyGo 平台数据。
- `chat`：打招呼、问能力、闲聊。
- `clarify`：关键字段缺失，需要追问。
- `update_context`：用户修改或补充已有上下文。

选择这 5 类是因为它们覆盖了前端 demo 里的主要交互路径，同时避免一开始就定义过细的意图分类导致 prompt 难以维护。

### 3. 条件边语法：JSONPath 布尔表达式

- **选择**：`condition` 字段使用 JSONPath 风格的布尔表达式，例如 `$.outputs.intent.intent == 'generate_plan'`。
- **理由**：与现有 `input_mapping` 的 `$.input.message`、`$.outputs.<node>.<field>` 语法保持一致，学习成本低。
- **替代方案**：自定义 DSL（`[intent, generate_plan]`）或 Python eval。前者需要额外文档，后者有安全风险。

### 4. 不满足 condition 的节点不进入分支

- **选择**：使用 LangGraph 的 `add_conditional_edges`，根据条件表达式的结果把执行路由到不同下游节点。不满足条件的分支不会执行。
- **理由**：符合 LangGraph 原生语义，避免生成空输出污染 `outputs`。
- **日志提示**： orchestrator 在构建图和执行时记录哪些条件分支被选中、哪些被跳过。

### 5. 复用 `/api/v1/workflows/{id}/run`

- **选择**：不新增 `/chat` 端点，前端调用 `POST /api/v1/workflows/chat-pipeline/run`。
- **理由**：保持 API 表面简洁，工作流运行 API 已经能承载输入/输出/状态。`chat_pipeline` 的条件路由让工作流本身成为对话控制器。
- **上下文传递**：请求体里带 `context`，如 `{ "brand_input": {...} }`，由 `intent_recognition` 节点读取。

### 6. data_query_agent 直接查询 mock 数据

- **选择**：`data_query_agent` 从 `backend/mock_data/` 读取城市/盟域/赛事/达人/场馆/经营社/人群画像数据，输出结构化摘要。
- **理由**：`data-query` capability 在 superpowers.yaml 中定义为 MVP 阶段用 mock 数据，预留真实 API 切换钩子。

### 7. Prompt 模板只写骨架

- **选择**：AI 只创建 `intent_recognition.md.j2` 的 Jinja2 骨架，包含输出 JSON 格式 instruction 和基础规则；少样本示例、分类边界、回复文案风格由产品方确认后填充。
- **理由**：根据项目约束，营销方案 Prompt 的文案策略和风格约束属于 AI 禁区，必须等人来定义。

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| 条件边表达式解析复杂度超出 MVP 范围 | 先只支持 `==` 和 `in` 两种操作，以及 `$.outputs.<node>.<field>` 和 `$.input.<field>` 两种指针，不满足时抛出 400 错误 |
| `intent_recognition` 输出不稳定导致路由错误 | 定义明确的 Pydantic schema 并用 `with_structured_output` 约束；低 confidence 时默认走 `clarify` |
| `generate_plan` 分支缺少字段时仍然进入下游 | `condition` 表达式可写为 `$.outputs.intent.intent == 'generate_plan' and len($.outputs.intent.missing_fields) == 0`，由工作流设计者控制 |
| 多轮对话上下文由客户端维护，存在被篡改风险 | MVP 阶段可接受；后续如需要可在服务端加会话层，属于独立 change |
| 新增 `data_query_agent` 和 `intent_recognition_agent` 增加单测和覆盖率压力 | 每个 Agent 输出结构固定，使用 mock LLM/结构化输出做单元测试，确保覆盖率 ≥80% |

## Migration Plan

- 本次变更是新增 capability，不破坏现有 `brand_research_pipeline`。
- `chat_extraction_agent` 保留，仍可被其他工作流复用。
- 部署后，前端可以选择切换入口到 `chat-pipeline`。
- 不需要数据库迁移或配置变更。

## Open Questions

1. `query_data` 是否需要支持按运动类型、时间范围等更细维度的过滤？当前先按城市输出全量摘要。
2. `update_context` 的字段更新语义是否允许部分覆盖？当前设计为部分覆盖已有 `brand_input`。
3. 是否需要为 `chat`/`clarify` 意图设计快捷按钮（quick chips）？本次只输出 `reply`，前端自行渲染。
