# Capability: plan-generation-pipeline

## Purpose

为 AllyGo 营销方案 Agent 提供从品牌需求到完整 9 章营销方案的后端生成流水线，通过 9 个串行 Agent 节点分别完成需求校验、市场调研、人群洞察、平台数据查询、适配度分析、策略生成、执行规划、预算 KPI 测算和行动建议，最终输出结构化方案内容。

## Requirements

### Requirement: 系统 SHALL 提供 plan_generation_pipeline 工作流

系统 SHALL 提供 `plan_generation_pipeline` 流水线，包含 10 个 Agent 节点（`product_research` / `market_research` / `audience_insight` / `plan_data_query` / `fitness_analysis` / `strategy_generation` / `execution_planning` / `budget_kpi` / `action_recommendations` / `plan_generator`），使用 LangGraph `StateGraph` 在代码中定义（不再使用 YAML）。流水线 SHALL 挂载 `AsyncSqliteSaver` checkpointer 并声明 `interrupt_before` 审核点，通过 `POST /api/v1/plan/run` 启动。

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

### Requirement: 流水线 SHALL 在确认节点前中断(interrupt_before)

系统 SHALL 在编译流水线时声明 `interrupt_before=["plan_data_query","fitness_analysis","strategy_generation","execution_planning","budget_kpi","action_recommendations","plan_generator"]`。从 `plan_data_query` 起每个节点执行前暂停,`workflow.paused` 的 `snapshot.node_id` SHALL 等于即将执行的节点(而非已完成节点),使用户的确认按钮出现在"谁需要确认"的节点上。

当执行到审核点节点前，LangGraph SHALL 自动中断并落盘 checkpoint。系统 SHALL 在 SSE 流末尾 emit `workflow.paused` 事件，data 包含 `run_id`、`snapshot` (当前 state values)、`reason`（`"review"` 或 `"failure"`）。

#### Scenario: 首次 pause 在 plan_data_query
- **GIVEN** 一个新 run 已完成 3 个并行调研节点(`product_research` / `market_research` / `audience_insight`)
- **WHEN** 流水线到达 `plan_data_query` 节点前
- **THEN** LangGraph SHALL 中断执行并写入 checkpoint
- **AND** SSE 流 SHALL emit `workflow.paused`，data 中 `snapshot.node_id` SHALL 为 `"plan_data_query"`
- **AND** data 中 `reason` SHALL 为 `"review"`
- **AND** data 中 `snapshot` SHALL 包含 `plan_data_query` 即将读取的所有字段

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

#### Scenario: node.log 包含操作步骤消息
- **WHEN** Agent 节点调用 `dispatch_custom_event("log", {"node_id": "...", "message": "..."})`
- **THEN** SSE 流 SHALL 推送 `event: node.log`
- **AND** data SHALL 包含 `run_id`、`node_id`、`message`
- **AND** `message` SHALL 为 Agent 当前执行步骤的中文描述文本

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

### Requirement: market_research 节点 SHALL 通过联网搜索获取市场数据

`market_research` 节点 SHALL 通过 SearxNG 实例（`searxng_search`）聚合多引擎获取真实网页，并发抓取后由 LLM 从网页内容提取结构化市场调研结果。调研 SHALL 覆盖四个字段组：市场定义（`market_definition`）、市场规模（`market_size`）、趋势（`trends`）、机会评估（`opportunities`）。节点 SHALL 不调研竞品（属 out_scope `competitor-analysis`）和目标用户（由 `audience_insight` 节点负责，避免重复）。

每条提取的非空信息 SHALL 标注来源 URL（来自已抓取的网页），网页未提及的字段 SHALL 写 null 或空值，LLM SHALL 不编造数据数值、机构名、品牌名。节点最终输出 SHALL 映射为 `MarketResearchOutput`（`market_summary` / `trends` / `opportunities`），下游节点契约不变。

#### Scenario: market_research 从真实网页提取并标注来源
- **GIVEN** 流水线真实模式运行（`USE_MOCK_DATA` 未开启），`SEARXNG_URL` 指向可达 SearxNG 实例
- **WHEN** `market_research` 节点执行
- **THEN** 节点 SHALL 调用 `searxng_search` 按品类/品牌相关关键词搜索
- **AND** SHALL 并发抓取搜索返回的网页（约 20 条）
- **AND** SHALL 用单次 LLM 调用从抓取到的网页内容提取市场调研结果
- **AND** 提取结果中每条非空信息 SHALL 标注来源 URL

#### Scenario: 网页未提及时不编造
- **GIVEN** 抓取到的网页中没有某字段（如 `market_size.som`）的数据
- **WHEN** LLM 提取该字段
- **THEN** 该字段 SHALL 为 null 或空值
- **AND** LLM SHALL 不编造数值或机构名

#### Scenario: market_research 不调研竞品和目标用户
- **WHEN** `market_research` 节点产出
- **THEN** 输出 SHALL 不包含竞品分析字段（属 out_scope）
- **AND** SHALL 不包含目标用户/用户画像字段（由 `audience_insight` 负责）
- **AND** SHALL 仍包含 `market_summary`、`trends`、`opportunities` 三个字段

#### Scenario: market_research 输出契约保持不变
- **WHEN** `market_research` 节点执行完成
- **THEN** state 中 `market_research` 字段 SHALL 包含 `market_summary`、`trends`、`opportunities`
- **AND** 下游节点（`strategy_generation`、`plan_generator`）SHALL 无需改动即可消费

#### Scenario: 搜索失败时返回空结果而非崩溃
- **GIVEN** SearxNG 实例不可达或搜索返回 0 条结果
- **WHEN** `market_research` 节点执行
- **THEN** 节点 SHALL 不抛异常
- **AND** SHALL 返回空的 `MarketResearchOutput`（`market_summary` 提示未找到市场信息，`trends` / `opportunities` 为空列表）
- **AND** SHALL 不 fallback 到 LLM 凭训练知识生成

### Requirement: market_research 节点 SHALL 支持 mock 模式

当 `USE_MOCK_DATA=true` 时，`market_research` 节点 SHALL 跳过联网搜索，从 `backend/mock_data/market_research/` 读取按品类维度的预设结构化市场调研结果。Mock 数据 SHALL 使用真实公开数据填写 `market_summary` / `trends` / `opportunities`，字段结构与真实模式一致，预留切换真实搜索的接口。

#### Scenario: mock 模式跳过联网读取预设数据
- **GIVEN** `USE_MOCK_DATA=true`
- **WHEN** `market_research` 节点执行
- **THEN** 节点 SHALL 不调用 `duckduckgo_search`
- **AND** SHALL 从 `backend/mock_data/market_research/` 读取对应品类的预设数据
- **AND** 输出 SHALL 包含 `market_summary`、`trends`、`opportunities`，结构与真实模式一致

### Requirement: action_recommendations 节点完成后 SHALL 异步触发宣传视频生成

action_recommendations 节点 handler 返回后，系统 SHALL 自动读取当前 state（brand_input、strategy_generation）并拼接 prompt，以 `asyncio.create_task` 方式后台启动 HappyHorse 视频生成任务。此异步任务 SHALL 不阻塞流水线后续节点执行。

#### Scenario: 异步任务生命周期
- **GIVEN** action_recommendations 节点执行成功
- **WHEN** handler 返回后
- **THEN** 系统 SHALL 立即拼接 prompt 并创建后台 video generation task
- **AND** plan_generator 节点 SHALL 继续执行，不受后台任务影响

### Requirement: 视频 SHALL 通过 get_status 端点与 outputs 合并返回

视频生成结果 SHALL 缓存于服务端内存（`_promo_video_cache`，key 为 run_id），通过 `GET /plan/runs/{run_id}/status` 端点与 outputs 合并返回。

#### Scenario: get_status 包含 promo_video
- **WHEN** 客户端调用 `GET /plan/runs/{run_id}/status`
- **THEN** 响应中的 `outputs` SHALL 包含 `promo_video` 字段
- **AND** promo_video 字段 SHALL 包含 `status`（generating / completed / failed）
- **AND** status 为 completed 时 SHALL 包含 `video_url`

### Requirement: 并行 fan-in 节点 pause 前 SHALL 校验前置完成

系统在发出 `workflow.paused` 之前,对于并行 fan-in 节点(`plan_data_query`),SHALL 校验所有并行前置节点(`product_research` / `market_research` / `audience_insight`)的 channel 输出均已存在。若任一前置未完成,ＤEFER 该 pause 事件。

#### Scenario: 并行未完成不提前 pause
- **WHEN** plan_data_query 被设為 next 但 3 个并行前置中尚有未完成输出
- **THEN** 不发 workflow.paused,前端继续通过 node.complete 自然收敛

### Requirement: Resume SHALL 不重跑已完成节点

`Command(resume={})` 触发的 entry point 重入 SHALL 跳过 channel 已有输出的并行节点,避免已完成节点被再次执行。

#### Scenario: 确认 plan_data_query 不重跑并行调研
- **WHEN** 用户确认 plan_data_query,resume 触发 `_dispatch_init`
- **THEN** 已完成的 product_research/market_research/audience_insight 不被重新 Send,plan_data_query 直接执行

### Requirement: workflow.complete SHALL 校验 plan_generator 输出

发出 `workflow.complete` 之前,系统 SHALL 校验 `output.plan_generator.chapters` 存在且非空。若缺失则不发 complete,防止 action 卡片在 plan_generator 未完成时提前显示。

#### Scenario: plan_generator 未完成不误发 complete
- **WHEN** LangGraph on_chain_end 触发但 plan_generator 输出缺失
- **THEN** 不发 workflow.complete,前端 action 卡片守卫隐藏下一步行动建议

### Requirement: market_research 节点 fetch 阶段 SHALL 有并发控制

`market_research` 节点在并发抓取搜索结果的网页时，SHALL 使用 `asyncio.Semaphore(8)` 控制同时最大并发连接数，避免 25 个请求同时涌出导致连接池拥堵。

#### Scenario: Semaphore 限制并发数
- **WHEN** `_fetch` 开始发起 25 个 HTTP 请求
- **THEN** 同时进行的请求 SHALL 不超过 8 个
- **AND** 后续请求 SHALL 在已有请求完成后递补

### Requirement: market_research 节点 fetch 超时 SHALL 为 10 秒

`market_research` 节点在并发抓取网页时，单个 HTTP 请求的超时 SHALL 为 10 秒（原 15 秒），慢页面快速放弃。

#### Scenario: 超时返回空结果
- **WHEN** 单个 HTTP 请求超过 10 秒未响应
- **THEN** 该页面 SHALL 标记为未抓取状态（`fetched: False`）
- **AND** 节点 SHALL 继续处理剩余页面，不中断整体流程

### Requirement: market_research 节点 SHOULD 跳过已知 403 域名

`_search` 函数在去重 URL 阶段，SHOULD 跳过 hostname 命中 `BLOCKED_DOMAINS` 集合（`zhuanlan.zhihu.com`、`baike.baidu.com`、`wenku.baidu.com`）的 URL，避免无用请求消耗并发槽位。

#### Scenario: 屏蔽域名不在搜索阶段展开
- **WHEN** `_search` 函数去重遍历搜索结果
- **THEN** URL 的 hostname 在 `BLOCKED_DOMAINS` 中时 SHALL 被跳过
- **AND** 该 URL 不会进入后续 fetch 阶段
- **AND** 不影响其他域名正常处理

### Requirement: product_research 和 audience_insight 节点 fetch 阶段 SHALL 有并发控制

product_research 和 audience_insight 节点在并发抓取搜索结果的网页时，SHALL 使用 `asyncio.Semaphore(8)` 控制最大并发连接数。

#### Scenario: Semaphore 限制并发数
- **WHEN** `fetch_node` 开始发起 HTTP 请求
- **THEN** 同时进行的请求 SHALL 不超过 8 个
- **AND** 后续请求 SHALL 在已有请求完成后递补

### Requirement: product_research 和 audience_insight 节点 SHALL 使用 10 秒超时

两个节点在并发抓取网页时，单个 HTTP 请求的超时 SHALL 为 10 秒。

#### Scenario: 超时返回空结果
- **WHEN** 单个 HTTP 请求超过 10 秒未响应
- **THEN** 该页面 SHALL 标记为未抓取状态
- **AND** 节点 SHALL 继续处理剩余页面，不中断整体流程

### Requirement: product_research 和 audience_insight 节点 SHOULD 跳过已知 403 域名

两个节点在搜索去重阶段，SHOULD 跳过 hostname 命中 `BLOCKED_DOMAINS` 集合（`zhuanlan.zhihu.com`、`baike.baidu.com`、`wenku.baidu.com`）的 URL。

#### Scenario: 屏蔽域名不影响其他 URL
- **WHEN** 搜索去重遍历搜索结果
- **THEN** 命中 BLOCKED_DOMAINS 的 URL 被跳过
- **AND** 不影响其他域名正常处理

### Requirement: product_research 和 audience_insight 节点 SHALL 单页截断 4000 字符

两个节点的 `MAX_PAGE_CHARS` SHALL 为 4000（与 market_research 对齐）。

#### Scenario: 页面内容截断
- **WHEN** 抓取的页面内容超过 4000 字符
- **THEN** 内容 SHALL 截断并追加截断标记
- **AND** LLM 提取环节仍能获取前 4000 字符的核心信息

### Requirement: 调研 agent SHALL 通过 SearxNG 实例做并发网页检索

`product_research` / `market_research` / `audience_insight` 三个调研 agent 的网页检索 SHALL 通过自托管 SearxNG 实例（`searxng_search()`）进行，而非直连单一搜索引擎。SearxNG 实例地址 SHALL 由 `SEARXNG_URL` 环境变量配置（默认 `http://localhost:8080`）。`searxng_search()` SHALL 返回与原 `duckduckgo_search` 同构的 `[{href, title, body}]` 列表，使三个 agent 仅改调用名即可切换。

SearxNG 聚合多引擎（默认请求级参数 `engines=bing,baidu`），SHALL 支持三个 agent 并行、每个 agent 内部多个关键词并行而不触发限流。当 SearxNG 实例不可达时，该关键词 SHALL 走 agent 已有的搜索失败降级（返回空、继续其他关键词），不抛致命异常。

#### Scenario: 三 agent 并行检索不被限流
- **GIVEN** 流水线真实模式运行，`SEARXNG_URL` 指向可达的 SearxNG 实例
- **WHEN** 三个调研 agent 同时启动、各自内部多关键词并行搜索
- **THEN** 每个关键词 SHALL 能拿到非空结果（不再出现 DDG 那种并发全空）
- **AND** 各 agent 的搜索结果池 SHALL 满足后续抓取需求

#### Scenario: searxng_search 返回结构与 duckduckgo_search 一致
- **WHEN** 调用 `searxng_search(keyword, max_results=N)`
- **THEN** 返回值 SHALL 为 `list[dict]`，每个 dict 含 `href`、`title`、`body` 三个字符串键
- **AND** `href` SHALL 为真实目标 URL（非 SearxNG 重定向链接）

#### Scenario: SearxNG 不可达时降级
- **GIVEN** `SEARXNG_URL` 指向的实例未启动或超时
- **WHEN** 某关键词调用 `searxng_search` 抛异常
- **THEN** agent SHALL 捕获异常、记录该关键词失败、继续其他关键词
- **AND** 节点 SHALL 不因搜索失败而整体崩溃

### Requirement: 调研 agent SHALL 抓取多个网页供 LLM 提取

三个调研 agent 搜索去重后 SHALL 并发抓取前若干条 URL（`FETCH_TOP` 约 20-25）供 LLM 提取。抓取的并发控制、超时、单页截断由各 agent 的 fetch 阶段需求规定（见「fetch 阶段并发控制」「10 秒超时」「单页截断 4000 字符」「跳过已知 403 域名」等相关需求）。搜索去重阶段 SHALL 跳过已知屏蔽域名和二进制文件 URL。候选不足上限时 SHALL 抓取全部候选，不强制凑满。

#### Scenario: 抓取多页供 LLM 提取
- **GIVEN** 某调研 agent 搜索阶段去重后得到 ≥20 条候选
- **WHEN** 进入抓取阶段
- **THEN** SHALL 并发抓取前若干条 URL（受 Semaphore 限流）
- **AND** LLM 提取阶段 SHALL 接收这些 URL 中抓取成功的有效正文

#### Scenario: 候选不足时抓全部
- **GIVEN** 搜索去重后候选少于抓取上限
- **WHEN** 进入抓取阶段
- **THEN** SHALL 抓取全部候选，不强制凑满
