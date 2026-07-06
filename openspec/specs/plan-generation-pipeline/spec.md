# Capability: plan-generation-pipeline

## Purpose

为 AllyGo 营销方案 Agent 提供从品牌需求到完整 9 章营销方案的后端生成流水线，通过 9 个串行 Agent 节点分别完成需求校验、市场调研、人群洞察、平台数据查询、适配度分析、策略生成、执行规划、预算 KPI 测算和行动建议，最终输出结构化方案内容。

## Requirements

### Requirement: 系统 SHALL 提供 plan_generation_pipeline 工作流

系统 SHALL 提供 `plan_generation_pipeline` 流水线，包含 9 个 Agent 节点（`product_research` / `market_research` / `audience_insight` / `plan_data_query` / `fitness_analysis` / `strategy_generation` / `execution_planning` / `budget_kpi` / `plan_generator`），使用 LangGraph `StateGraph` 在代码中定义（不再使用 YAML）。流水线 SHALL 挂载 `AsyncSqliteSaver` checkpointer 并声明 `interrupt_before` 审核点，通过 `POST /api/v1/plan/run` 启动。

#### Scenario: 启动新 run
- **GIVEN** 用户已提供合法 `brand_input`
- **WHEN** 客户端调用 `POST /api/v1/plan/run` 请求体 `{"brand_input": {...}}`
- **THEN** 系统 SHALL 返回 SSE 响应，`Content-Type` 为 `text/event-stream`
- **AND** 响应头 SHALL 包含 `X-Run-Id`
- **AND** 首帧 SHALL 为 `workflow.start` 且包含 `run_id`
- **AND** 后续帧 SHALL 依次推送节点生命周期事件直到第一个审核点或结束

#### Scenario: 请求体 schema 校验失败
- **WHEN** 客户端 POST 请求体缺少 `brand_input` 字段或 `brand_input.budget < 1`
- **THEN** 系统 SHALL 返回 HTTP 422
- **AND** 错误信息 SHALL 指明缺失或非法字段

### Requirement: 流水线 SHALL 使用 AsyncSqliteSaver checkpointer 持久化 run state

系统 SHALL 在编译 LangGraph `StateGraph` 时挂载 `AsyncSqliteSaver`，checkpoint 数据 SHALL 写入 `backend/data/checkpoints.db`。每次 run 使用后端生成的 `uuid4` 作为 LangGraph `thread_id`，也作为对外的 `run_id`。checkpoint 数据库路径 SHALL 通过环境变量 `CHECKPOINT_DB_PATH` 可覆盖，默认 `backend/data/checkpoints.db`。

#### Scenario: 首次启动创建 checkpoint 数据库
- **GIVEN** `backend/data/checkpoints.db` 不存在
- **WHEN** FastAPI 应用启动并首次调用 `POST /api/v1/plan/run`
- **THEN** 系统 SHALL 自动创建 `backend/data/` 目录和 `checkpoints.db` 文件
- **AND** 后续所有 run 的 checkpoint SHALL 写入同一文件

#### Scenario: 每个 run 用独立 thread_id 持久化
- **WHEN** 系统启动一个新 run
- **THEN** 系统 SHALL 生成 `uuid4` 作为 `thread_id` 和 `run_id`
- **AND** LangGraph SHALL 在每次节点完成后自动写入该 thread_id 对应的 checkpoint

### Requirement: 流水线 SHALL 在三个强审核点前中断

系统 SHALL 在编译流水线时声明 `interrupt_before=["strategy_generation","execution_planning","plan_generator"]`。当执行到审核点节点前，LangGraph SHALL 自动中断并落盘 checkpoint。系统 SHALL 在 SSE 流末尾 emit `workflow.paused` 事件，data 包含 `run_id`、`awaiting_node`、`snapshot` (当前 state values)、`reason`（`"review"` 或 `"failure"`）。

#### Scenario: 跑到 strategy_generation 前自动暂停
- **GIVEN** 一个新 run 已完成 `product_research`、`market_research`、`audience_insight`、`plan_data_query`、`fitness_analysis`
- **WHEN** 流水线到达 `strategy_generation` 节点前
- **THEN** LangGraph SHALL 中断执行并写入 checkpoint
- **AND** SSE 流 SHALL emit `workflow.paused`，data 中 `awaiting_node` SHALL 为 `"strategy_generation"`
- **AND** data 中 `reason` SHALL 为 `"review"`
- **AND** data 中 `snapshot` SHALL 包含 `strategy_generation` 即将读取的所有字段

#### Scenario: 节点抛异常也走 paused 语义
- **GIVEN** `market_research` 节点执行时抛出异常
- **WHEN** 异常被 handler 层捕获
- **THEN** 系统 SHALL 保留当前 checkpoint（含已完成节点输出）
- **AND** SSE 流 SHALL emit `node.failed` 事件后再 emit `workflow.paused`，`reason` SHALL 为 `"failure"`、`awaiting_node` SHALL 为失败的节点 ID

### Requirement: 系统 SHALL 提供审核点交互 API

系统 SHALL 暴露以下端点用于审核点交互，全部路径以 `/api/v1/plan/` 为前缀：

- `POST /api/v1/plan/runs/{run_id}/approve` — 通过当前审核点，请求体可选 `patch`（整节点输出替换），SSE 流式返回继续执行的事件流。
- `POST /api/v1/plan/runs/{run_id}/reject` — 打回上一步重生成，请求体 `target_node` 限制为「当前审核点」或「上一个审核点」，可选 `patch`，SSE 流式返回。
- `POST /api/v1/plan/runs/{run_id}/cancel` — 取消 run 并清除 checkpoint，返回同步 JSON `{status: "cancelled"}`。
- `GET  /api/v1/plan/runs/{run_id}/status` — 返回当前 state 快照，用于前端刷新恢复。

#### Scenario: approve 无 patch 直接继续
- **GIVEN** run 已在 `strategy_generation` 前暂停
- **WHEN** 客户端调用 `POST /api/v1/plan/runs/{run_id}/approve` 请求体为空对象
- **THEN** 系统 SHALL 从 checkpoint 恢复并执行 `strategy_generation` 节点
- **AND** SSE 流 SHALL 推送后续节点事件直到下一个审核点或流程结束

#### Scenario: approve 带 patch 覆盖上游节点输出
- **GIVEN** run 已在 `strategy_generation` 前暂停
- **WHEN** 客户端调用 `POST /api/v1/plan/runs/{run_id}/approve` 请求体 `{"patch": {"fitness_analysis": {...}}}`
- **THEN** 系统 SHALL 用 patch 内容覆盖对应节点输出后再继续
- **AND** 覆盖后的 state SHALL 落盘为新的 checkpoint

#### Scenario: reject 回到当前审核点重跑
- **GIVEN** run 已在 `plan_generator` 前暂停
- **WHEN** 客户端调用 `POST /api/v1/plan/runs/{run_id}/reject` 请求体 `{"target_node": "plan_generator"}`
- **THEN** 系统 SHALL 回滚 checkpoint 到 `plan_generator` 之前
- **AND** SSE 流 SHALL 重新推送 `plan_generator` 相关事件

#### Scenario: reject target_node 跨审核点被拒绝
- **GIVEN** run 已在 `plan_generator` 前暂停
- **WHEN** 客户端调用 `POST /api/v1/plan/runs/{run_id}/reject` 请求体 `{"target_node": "strategy_generation"}` 且 `strategy_generation` 不是当前或上一个审核点
- **THEN** 系统 SHALL 返回 HTTP 400
- **AND** 错误码 SHALL 提示 target_node 超出允许范围

#### Scenario: cancel 立即删除 checkpoint
- **GIVEN** run 处于任意状态（运行中、暂停、完成）
- **WHEN** 客户端调用 `POST /api/v1/plan/runs/{run_id}/cancel`
- **THEN** 系统 SHALL 立即删除该 thread_id 对应的所有 checkpoint 数据
- **AND** 返回 `{status: "cancelled", run_id: "<uuid>"}`
- **AND** 该 run_id SHALL 不可再被 approve / reject / status 复活

#### Scenario: 查询已完成 run 的状态
- **GIVEN** run 已成功完成
- **WHEN** 客户端调用 `GET /api/v1/plan/runs/{run_id}/status`
- **THEN** 系统 SHALL 返回 `{status: "completed", outputs: <完整 state values>, awaiting_node: null}`

### Requirement: SSE 协议 SHALL 遵循标准三行帧格式

系统所有 SSE 事件 SHALL 使用 `id: / event: / data:` 三行格式，每帧 `data` SHALL 为合法 JSON 字符串。`run_id` SHALL 同时冗余到响应头 `X-Run-Id` 和首帧 `workflow.start` 的 `data.run_id` 中。事件表：

| event | data 字段 |
|-------|-----------|
| `workflow.start` | `run_id` |
| `node.start` | `run_id, node_id, label` |
| `node.log` | `run_id, node_id, message` |
| `node.complete` | `run_id, node_id, data` |
| `node.failed` | `run_id, node_id, error` |
| `chapter.start` | `run_id, node_id="plan_generator", chapter_index, title` |
| `chapter.complete` | `run_id, node_id="plan_generator", chapter_index, title, subtitle, content` |
| `workflow.paused` | `run_id, awaiting_node, snapshot, reason` |
| `workflow.complete` | `run_id, outputs` |
| `workflow.cancelled` | `run_id` |

#### Scenario: 每帧包含单调递增的 id
- **WHEN** SSE 流推送第 N 个事件
- **THEN** 该帧 SHALL 以 `id: <N>` 开头（N 从 1 单调递增）
- **AND** 后续行 SHALL 为 `event: <类型>` 和 `data: <JSON>`
- **AND** 帧末 SHALL 有空行分隔

#### Scenario: workflow.start 首帧带 run_id
- **WHEN** 客户端建立新 SSE 连接（POST `/plan/run` 或 approve / reject）
- **THEN** 首帧 event SHALL 为 `workflow.start`
- **AND** data JSON SHALL 包含 `run_id`
- **AND** 响应头 SHALL 包含 `X-Run-Id: <run_id>`

### Requirement: plan_generator 节点 SHALL 按 9 章顺序流式生成

`plan_generator` 节点 SHALL 按 `PLAN_CHAPTER_SPEC` 常量中定义的 9 章顺序（详见 design.md）逐章调用 LLM，每章调用完成后 SHALL 通过 `dispatch_custom_event` emit `chapter.complete` 事件。9 章的 `title` 和 `subtitle` SHALL 完全由 `PLAN_CHAPTER_SPEC` 决定，LLM SHALL 只生成 `content` 字段。每章生成时 handler SHALL 把已完成章节数组作为上下文传入 prompt。

#### Scenario: 顺序生成 9 章并推送事件
- **GIVEN** 用户已 approve `plan_generator` 前的审核点
- **WHEN** `plan_generator` 节点开始执行
- **THEN** 节点 SHALL 顺序执行 9 次 LLM 调用（chapter_index 从 0 到 8）
- **AND** 每次 LLM 调用前 SHALL emit `chapter.start` 事件（含 `chapter_index`、`title`）
- **AND** 每次 LLM 调用完成后 SHALL emit `chapter.complete` 事件（含 `chapter_index`、`title`、`subtitle`、`content`）
- **AND** 节点最终返回的 state 中 `chapters` 数组长度 SHALL 为 9

#### Scenario: LLM 不能覆盖 title/subtitle
- **WHEN** LLM 返回的章节数据包含与 `PLAN_CHAPTER_SPEC` 不一致的 `title` 或 `subtitle`
- **THEN** 系统 SHALL 用 `PLAN_CHAPTER_SPEC` 中的值覆盖
- **AND** 最终返回的 chapter 的 `title` / `subtitle` SHALL 严格等于常量定义

#### Scenario: 章节 N 引用章节 1..N-1 上下文
- **WHEN** 生成第 5 章（`达人体系`）
- **THEN** LLM prompt SHALL 包含前 4 章已生成的 `content`
- **AND** 章节间叙事 SHALL 一致

### Requirement: 每个 Agent 节点 SHALL 输出结构化数据

每个 Agent 节点 SHALL 使用 Pydantic structured output，输出下游节点可解析的结构化数据。节点输出 SHALL 通过 LangGraph state 传递给下游，state 结构由 `PlanState` TypedDict 声明。

#### Scenario: market_research 输出结构化市场分析
- **WHEN** `market_research` 节点执行完成
- **THEN** state 中 `market_research` 字段 SHALL 包含 `market_summary`、`trends`、`opportunities`

#### Scenario: fitness_analysis 输出适配度评分
- **WHEN** `fitness_analysis` 节点执行完成
- **THEN** state 中 `fitness_analysis` 字段 SHALL 包含 `sport_fitness_scores` 列表
- **AND** 每个 SHALL 包含 `sport`、`score`、`reason`

#### Scenario: plan_generator 输出 9 章方案
- **WHEN** `plan_generator` 节点执行完成
- **THEN** state 中 `plan_generator` 字段 SHALL 包含 `chapters` 列表
- **AND** 每个 chapter SHALL 包含 `index`、`title`、`subtitle`、`content`
- **AND** `chapters` 长度 SHALL 为 9

### Requirement: 数据引用必须来自 mock 数据或真实 API

所有城市人口、运动指数、赛事数量、达人数量、场馆数量、经营社数量等数据数值 SHALL 来自 `backend/mock_data/` 或真实 API 返回，LLM 禁止编造。9 章方案 `title` / `subtitle` 属于代码常量不属于 mock 范畴，但 LLM 生成的 `content` 中引用的任何厂商 / 赛事 / 达人 / 数据数值 SHALL 只来自上游节点的结构化输出。

#### Scenario: plan_data_query 节点返回上海数据
- **GIVEN** `brand_input.city` 为 "上海"
- **WHEN** `plan_data_query` 节点执行
- **THEN** 输出中的 `population`、`leagues_count`、`events_monthly`、`influencers_count`、`venues_count`、`stores_count` SHALL 与 mock 数据中上海条目一致

#### Scenario: plan_generator 引用的实体只来自上游
- **WHEN** `plan_generator` 生成的 chapter content 提到某个赛事名称
- **THEN** 该名称 SHALL 出现在 `market_research` / `plan_data_query` 等上游节点输出中
- **AND** LLM SHALL 不允许自行编造上游数据未提及的赛事 / 达人 / 厂商

### Requirement: 流水线 SHALL 支持 mock 模式运行

当环境变量 `USE_MOCK_DATA=true` 时，Agent 节点 SHALL 返回预设的结构化输出，不调用 LLM。checkpointer 和 interrupt_before 语义 SHALL 与真实模式一致，用户仍可 approve / reject / cancel。

#### Scenario: mock 模式跑到审核点也停下
- **GIVEN** `USE_MOCK_DATA=true`
- **WHEN** 调用 `POST /api/v1/plan/run` 完成前 5 个节点
- **THEN** 流水线 SHALL 在 `strategy_generation` 前 emit `workflow.paused`
- **AND** 用户 approve 后 SHALL 继续到下一个审核点或完成
