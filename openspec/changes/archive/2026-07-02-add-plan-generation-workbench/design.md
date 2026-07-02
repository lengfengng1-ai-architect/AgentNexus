## Context

当前项目已有：
- `chat_pipeline` 工作流：统一识别用户意图，抽取品牌字段，生成口语化回复。
- `/chat` 前端页面：对话式需求采集入口，已接入 `chat_pipeline`。
- 可配置工作流底座：`backend/app/agents/orchestrator.py` + YAML 工作流定义，支持节点注册、输入映射、条件边、串行执行。
- 部分数据/分析 Agent：`product_research_agent`、`data_query_agent`。

缺失部分：
- `generate_plan` 意图没有后续执行路径，用户无法看到 Agent 执行过程，也无法预览完整方案。
- 工作流运行 API 是同步请求，无法实时推送节点状态。
- 缺少专门的工作台页面承载方案生成和预览。

本 change 补齐从"一句话需求"到"完整方案"的闭环。

## Goals / Non-Goals

**Goals：**
- 用户从 `/chat` 确认生成方案后，能进入 `/plan` 工作台看到 9 步 Agent 流水线执行过程。
- 后端通过 SSE 实时推送每个 Agent 节点的开始、日志、完成、失败状态。
- Agent 节点失败时阻塞，用户可选择重试该节点、跳过该节点或终止流程，已完成的节点结果从 LangGraph state 复用。
- `/plan` 左侧展示会话摘要和可编辑表单，右侧展示流水线、方案预览、行动建议。
- 新增 7 个 Agent 节点，补齐市场调研后的人群洞察、适配度分析、策略生成、执行规划、预算与 KPI、行动建议能力。
- 默认自动继续执行，但提供开关；每个 Agent 完成后仍可展开查看摘要。

**Non-Goals：**
- 不实现方案自动执行（创建活动、发送达人邀约等），行动建议仅展示。
- 不实现跨平台数据接入、效果归因、竞品分析。
- 不实现非运动品牌支持。
- 不实现真实的文档导出 PDF/Word 服务（接口预留，MVP 阶段可用前端打印/简单导出占位）。
- 不实现工作流并行执行，MVP 阶段保持串行。

## Decisions

### 1. 页面架构：`/chat` + `/plan` 双页

- `/chat` 继续作为自然语言需求采集入口。
- 当 `chat_pipeline` 识别到 `generate_plan` 且 `brand_input` 字段基本完整时，在 AI 回复下方显示"生成方案"按钮。
- 点击后把 `brand_input` 和会话上下文写入 localStorage，并导航到 `/plan?session=<id>`。
- `/plan` 左侧固定显示会话摘要 + 可编辑表单，右侧为方案生成工作台。

**替代方案**：单页三栏布局。放弃原因：桌面端太挤，移动端几乎不可用，把采集和生成耦合在一个页面。

### 2. Agent 流水线：默认自动继续 + 失败后阻塞

- 默认开启"自动继续"，Agent 节点自动流转。
- 节点失败时自动切换为阻塞状态，等待用户选择重试/跳过/终止。
- 关闭"自动继续"时，每个 Agent 完成后暂停，显示"确认继续"/"重新执行"。
- 方案生成完成后，再向用户询问"查看方案"/"调整策略"/"重新生成"。

**替代方案**：所有节点都需要人工确认。放弃原因：任务型用户只想快速拿到结果，频繁确认会打断流程。

### 3. SSE 流式状态推送

- 工作流运行接口新增 `POST /api/v1/workflows/{workflow_id}/run?stream=true`，返回 `text/event-stream`。
- SSE 事件类型：`workflow.start` / `node.start` / `node.log` / `node.complete` / `node.failed` / `node.waiting` / `workflow.complete` / `workflow.failed`。
- 普通 `POST /api/v1/workflows/{workflow_id}/run` 保持同步返回，兼容现有调用。

**替代方案**：WebSocket。放弃原因：工作流状态是单向推送，SSE 更轻量；替代方案：轮询。放弃原因：不是真实时，体验差。

### 4. 方案生成流水线设计

新增 `plan_generation_pipeline.yaml`，包含 9 个串行节点：
1. `collect`：校验 `brand_input` 完整性。
2. `market_research`：行业趋势、竞争格局、消费洞察。
3. `audience_insight`：目标城市运动人群画像分析。
4. `data_query`：查询城市级盟域/赛事/达人/场馆/经营社数据。
5. `fitness_analysis`：品牌品类 × 运动场景适配度评分。
6. `strategy_generation`：核心定位、4M+1C 策略框架。
7. `execution_planning`：赛事/盟域/达人/内容/数字化运营落地方案。
8. `budget_kpi`：预算分配、KPI 预测、时间表。
9. `action_recommendations`：可执行下一步行动建议。

每个 Agent 输出结构化数据，最终由 `plan_generator`（可作为独立节点或 `budget_kpi` 下游）汇总为 9 章 Markdown 方案。

**替代方案**：把 9 章生成放在一个 LLM 调用里完成。放弃原因：输出太长不可控，且无法展示中间过程。

### 5. 数据边界

- 所有厂商/赛事/达人名称、城市数据、人群规模、活动密度、成本参数必须来自 `backend/mock_data/` 或真实 API 返回。
- LLM 可以生成创意策划内容（赛事名称、活动形式、主题概念、时间线规划）和文案润色。
- 适配度评分、预算分配比例等数值由规则矩阵或基于 mock 数据的计算产生，不由 LLM 编造。

### 6. 状态管理

后端：
- LangGraph state 包含 `input`、`outputs`（每个节点输出字典）、`status`。
- SSE handler 在 node wrapper 中触发事件。

前端：
- `/plan` 页面使用 React state 管理 `pipeline` 节点列表、`logs` 实时日志、`plan` 方案内容、`error` 失败节点。
- SSE 连接封装为 `useWorkflowSSE` hook。

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| 9 个 Agent 串行调用 LLM，总耗时长（30-60s） | SSE 实时推送进度，用户可看到每个节点在执行；默认自动继续减少等待中断；后续可优化为并行执行 |
| LLM 输出格式不稳定，下游节点解析失败 | 每个 Agent 使用 Pydantic structured output，严格 schema；解析失败视为节点失败，可重试 |
| 某个 Agent 失败后用户选择跳过，方案质量下降 | UI 明确提示"跳过可能导致该章节内容缺失"；最终方案中标注哪些部分基于默认假设 |
| 前端状态复杂，SSE 重连/断线处理困难 | 实现 SSE 自动重连；断线后可通过 GET run status 轮询兜底 |
| 9 个新 Agent 工作量大 | MVP 阶段先做核心节点（market_research、strategy、execution、budget_kpi），其他节点可用简化 mock 实现，后续迭代 |
| 移动端 /plan 流水线展示空间不足 | 时间线垂直折叠，节点默认只显示标题，点击展开详情 |

## Migration Plan

- 新增文件为主，不破坏现有 `chat_pipeline` 和 `/chat` 页面。
- 同步接口保持兼容，SSE 接口为新增可选参数。
- 前端新增 `/plan` 路由，不影响现有路由。
- 部署后需验证 CORS 对 SSE 端点的支持。

## Open Questions

1. `plan_generator` 是作为独立节点还是由 `budget_kpi` 输出 9 章 Markdown？建议由 `budget_kpi` 下游的独立 `plan_generator` 节点统一渲染，便于前端直接读取。
2. 是否需要为每个 Agent 设计 mock 模式，以便不调用 LLM 也能跑通流水线测试？建议保留 `USE_MOCK_DATA=true` 配置，让 Agent 返回预设结构化输出。
3. `/plan` 页面左侧表单编辑后，是否需要重新跑整个流水线？MVP 阶段建议重新跑；后续可支持增量更新特定节点。
