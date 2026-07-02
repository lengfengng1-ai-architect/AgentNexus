## Context

当前 `chat_pipeline` 工作流包含 `intent`、`extract`/`data_query`/`end_reply` 三个条件分支。各分支节点执行完成后直接结束，没有一个统一节点负责把意图识别结果、提取到的品牌字段以及下游输出包装成一句自然、口语化的回复。主对话 tab 仍调用旧的 `/api/v1/chat` 接口，因此用户无法在主对话中感知到意图识别结果。

## Goals / Non-Goals

**Goals:**
- 在 `chat_pipeline` 末尾增加一个 `reply_builder` 节点，作为所有分支的统一收口。
- `reply_builder` 使用 LLM 生成一句自然语言回复，让用户感知到系统识别到的意图和关键字段。
- 主对话 tab 改为直接调用 `POST /api/v1/workflows/chat_pipeline/run`。
- 保留「意图测试」tab 不变，继续作为结构化调试入口。

**Non-Goals:**
- 不替代现有 `intent_recognition` 节点，只在末尾做回复包装。
- 不修改 `extract`、`data_query`、`end_reply` 节点的内部逻辑。
- 不引入新的 Agent 框架或新的包管理器。
- 不为「意图测试」tab 增加新功能。

## Decisions

### 1. `reply_builder` 作为 `chat_pipeline` 的最后一个节点

**选择**：把 `reply_builder` 放在 `extract`、`data_query`、`end_reply` 之后，所有分支最终都连到它。

**理由**：
- 无论用户意图是 `generate_plan`、`query_data`、`chat`、`clarify` 还是 `update_context`，都需要给用户一句自然语言回复。
- 统一收口避免每个分支自己维护回复文案，后续调整语气只需改一个 prompt。

**替代方案**：给每个分支单独写模板。拒绝原因：重复且难以保持语气一致。

### 2. `reply_builder` 通过 `$.outputs.intent` 和 `$.outputs.<last_node>` 读取输入

**选择**：`reply_builder` 的 `input_mapping` 包含 `intent`、`branch_output` 和 `message`。

**理由**：
- `intent` 包含意图类型、置信度、`brand_input`、`missing_fields`、`updated_fields`。
- `branch_output` 包含最后实际执行分支的输出（如 `extract` 的 `brand_input` 或 `data_query` 的 `reply`）。
- `message` 保留原始用户输入，便于 LLM 做上下文理解。

**替代方案**：让 orchestrator 自动合并所有节点输出到一个 `final_state`。拒绝原因：当前 orchestrator 的 `$.state` 已经包含完整 state，但显式映射更清楚，也便于测试。

### 3. `reply_builder` 使用 LLM 而非固定模板

**选择**：使用 LLM + 结构化输出 `reply: str`。

**理由**：
- 用户要求更口语化，模板难以覆盖所有意图组合。
- LLM 可以根据 `missing_fields` 自然地问出需要补充的信息。
- 结构化输出保证前端拿到的是一个简单字符串。

**替代方案**：Jinja2 模板。拒绝原因：文案生硬，难以体现"识别到了什么"的灵活表达。

### 4. 前端 `useChat` 直接调用工作流

**选择**：修改 `frontend/src/hooks/useChat.ts`，把 `sendChatMessage` 替换为 `runChatPipeline`。

**理由**：
- 直接复用已建成的 `/api/v1/workflows/chat_pipeline/run` 端点，无需后端新增 `/chat` 接口。
- 工作流输出中的 `outputs.reply_builder.reply` 可直接作为 AI 气泡内容。
- `outputs.intent.brand_input` 可映射到 `ProgressTrack`。

**替代方案**：保留 `/chat` 接口，后端内部调工作流。拒绝原因：多一层封装，且无法让前端直接拿到工作流完整输出。

### 5. 自然语言回复风格

**选择**：口语化、简短、不堆砌字段。

**示例**：
- `generate_plan`："好，Nike 在上海做跑步推广，预算 50 万，周期 3 个月，我记下了。接下来我给你生成一份营销方案。"
- `query_data`："我理解为：你想看看上海的平台数据。已查到 342 个盟域、156 场月均活动……需要我基于这些数据生成方案吗？"
- `clarify`："想做方案的话，我还需要确认：品类是什么？"
- `chat`："你好！我是 AllyGo 营销方案 Agent，可以帮你生成营销方案或查询平台数据。"
- `update_context`："已把城市改成北京，其他信息保持不变。"

## Risks / Trade-offs

- **LLM 不稳定导致回复不一致**：通过结构化输出和明确 prompt 约束来缓解；必要时增加 fallback 模板。
- **工作流运行时间变长**：新增一个 LLM 节点会增加延迟。 ponytail: MVP 先接受，后续可改为异步流式输出或缓存。
- **意图测试 tab 和主对话共用工作流**：修改 `chat_pipeline` 会影响两个入口，需要同时验证两者。
- **`brand_input` 字段差异**：`intent.brand_input` 与 `extract.brand_input` 可能不完全一致（如 `category` 在 intent 中为空字符串）。决定以 `intent.brand_input` 作为 `ProgressTrack` 数据源，因为它始终存在。

## Migration Plan

1. 后端新增 `reply_builder_agent.py` 和 prompt 模板。
2. 修改 `chat_pipeline.yaml`，加入 `reply_builder` 节点和边。
3. 后端启动后，先通过 curl/预览验证工作流输出包含 `outputs.reply_builder.reply`。
4. 前端修改 `useChat.ts` 调用工作流。
5. 同时验证主对话 tab 和「意图测试」tab。

## Open Questions

- `reply_builder` 是否需要返回 `brand_input` 供前端使用，还是只返回字符串？（当前设计：只返回字符串，`brand_input` 从 `outputs.intent.brand_input` 读取。）
- 是否需要在 `ChatMessage` 类型中保存结构化意图结果，以便用户点击消息查看详情？（当前设计：先不保存，只保存 `reply` 和 `brand_input`。）
