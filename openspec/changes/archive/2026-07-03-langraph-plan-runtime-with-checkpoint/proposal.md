## Why

方案生成流水线当前存在两组耦合问题：

1. **前后端契约断裂**：commit `1470bcb`(archive `2026-07-03-simplify-workflow-orchestration`) 只删了 YAML runtime 的后端代码，没同步前端 API 层和 4 份 openspec/specs。前端仍打 `/workflows/...` 路径(404)、`useWorkflowSSE` 解析条件要求后端每帧带 `run_id`/`id`(实际后端只发 `event/data`)、`startPlanRun` 请求体多包一层 `input`(与后端签名不一致，触发 422)。结果 `/plan` 页无法真正跑起来。
2. **缺少人工审核能力**：现有 `plan_generation_service.py` 有 `run_pipeline`(ainvoke) 和 `run_stream`(手写 for 循环，绕过 astream) 两份实现在漂移；没有 checkpointer，没有人工介入机制。而营销方案是一个**必须让人审核策略/执行/最终稿再往下走**的产品，纯自动 pipeline 输出的方案不可用。

本次一并把 pipeline 换到 LangGraph 官方推荐的 `AsyncSqliteSaver checkpointer + interrupt_before + astream_events` 组合上，通过强审核点让人在 `strategy_generation`/`execution_planning`/`plan_generator` 前介入，并借这次改造顺手做掉 `plan_generator` 节点的**章节级流式**(每章一次 LLM 调用、边生成边推)——反正 `plan_generator` 内部本来就要动。

对应 `docs/superpowers.yaml` 的 `plan-generation` in_scope 能力。

## What Changes

- **BREAKING** 移除 `services/plan_generation_service.py::run_pipeline`，只保留流式实现 `run_stream`；非流式需求由 `astream` 消费到末尾等价满足。
- **BREAKING** `POST /api/v1/plan/run` 请求体从 `BrandInput` 改为 `PlanRunRequest`(顶层 `{brand_input: {...}}`)。
- 引入 `AsyncSqliteSaver` checkpointer，文件位于 `backend/data/checkpoints.db`(加入 `.gitignore`)。`_pipeline` 编译时声明 `interrupt_before=["strategy_generation","execution_planning","plan_generator"]`。
- 新增审核点交互 API：
  - `POST /api/v1/plan/runs/{run_id}/approve` — 通过(可带 patch 覆盖当前节点输出)
  - `POST /api/v1/plan/runs/{run_id}/reject` — 打回当前 / 上一个审核点重跑
  - `POST /api/v1/plan/runs/{run_id}/cancel` — 取消并清除 checkpoint
  - `GET  /api/v1/plan/runs/{run_id}/status` — 查询快照
- SSE 协议规范化：每帧 `id/event/data` 三行；首帧 `workflow.start` 带 `run_id`；跑到审核点前 emit `workflow.paused {awaiting_node, snapshot, reason}`；节点内部支持 `chapter.start` / `chapter.complete` 增量事件。
- `plan_generator` 节点改造为**一章一次 LLM 调用**顺序生成，9 章 `title/subtitle` 由代码中 `PLAN_CHAPTER_SPEC` 常量固定，LLM 只填 `content`；通过 `dispatch_custom_event` 推送 `chapter.*` 事件。
- 前端连锁：`api/plan.ts` 请求体去掉 `input` 包装、`resumePlanRun`/`controlPlanRun` 拆成 `approvePlanRun`/`rejectPlanRun`/`cancelPlanRun`、`getPlanRunStatus` 改指 `/plan/runs/{id}/status`；`hooks/useWorkflowSSE.ts` 重命名 `usePlanRun.ts`；`PlanPage.tsx` 支持审核点面板。
- 清理陈旧 spec：删除 `workflow-orchestration` 和 `workflow-sse-streaming` 两个 capability(概念已死)。

## Capabilities

### New Capabilities

无。checkpointer / interrupt / SSE / API 全部并入 `plan-generation-pipeline`，避免为一条流水线再拆一个 capability。

### Modified Capabilities

- `plan-generation-pipeline`: 端点前缀改 `/api/v1/plan/*`；执行模型从「YAML runtime + retry/skip/abort」换成「LangGraph checkpointer + interrupt_before + approve/reject/cancel」；新增章节级 SSE 事件契约；plan_generator 内部从「一次性生成 9 章」变为「顺序生成 9 章、边生成边推」。
- `plan-generation-workbench`: `/plan` 页审核 UI 从「重试/跳过/终止」按钮换成「通过/改再通过/打回」；去掉「关闭自动继续」开关(概念已作废，interrupt_before 天然停在审核点)；渐进式渲染方案时对齐新的 `chapter.*` SSE 事件。

### Removed Capabilities

- `workflow-orchestration`: 通用 YAML runtime 概念已随 `2026-07-03-simplify-workflow-orchestration` 删除代码，本次同步删除 spec。
- `workflow-sse-streaming`: 通用 `/workflows/*` SSE 协议同上，SSE 契约合并进 `plan-generation-pipeline`。

## Impact

**后端**
- 修改：`app/services/plan_generation_service.py`(重写)、`app/routers/plan.py`(新增 4 端点)、`app/main.py`(无变动，plan router 已注册)、`app/agents/plan_generator.py`(改为章节顺序生成 + `dispatch_custom_event`)、`app/schemas/plan_generation.py`(新增 `PLAN_CHAPTER_SPEC` 常量)
- 新增：`app/schemas/plan_run.py`(`PlanRunRequest`/`ApproveRequest`/`RejectRequest`/`RunStatus`)、`backend/data/`(gitkeep) + `.gitignore` 追加 `backend/data/checkpoints.db*`
- 依赖：`pyproject.toml` 加 `langgraph-checkpoint-sqlite`(通过 uv 安装)

**前端**
- 修改：`src/api/plan.ts`(4 个函数改路径 + 请求体)、`src/pages/PlanPage.tsx`(审核点面板)
- 改名：`src/hooks/useWorkflowSSE.ts` → `src/hooks/usePlanRun.ts` + 对应测试文件

**契约文件**
- 新增/更新：`docs/api/paths/plan.yaml`(5 个端点契约)
- 删除：`openspec/specs/workflow-orchestration/`、`openspec/specs/workflow-sse-streaming/`
- 修改：`openspec/specs/plan-generation-pipeline/spec.md`、`openspec/specs/plan-generation-workbench/spec.md`

**Mock 数据**：不涉及新增。9 章 `title/subtitle` 属于代码常量不属于 mock；`plan_generator` 内部逐章调用的 LLM 仍受"数据引用必须来自 API/mock"约束，跨章上下文只允许引用上游节点已有的结构化输出。

**Non-goals**(显式 out-of-scope)
- 主动 pause API：审核点模式(interrupt_before)已覆盖唯一暂停需求，不做通用暂停接口。
- `node.log` 真进度：短期继续用 `_NODE_LOG_STEPS` 假日志兼容前端渲染，agent 层真进度改造属独立 change。
- 多租户 / run 归属 / 认证：仍不做，`thread_id = run_id`(uuid4) 保证全局唯一即可，对应 `docs/superpowers.yaml::out_scope.user-auth-system`。
- 章节级 patch：`approve` 的 patch 只支持整节点替换；改某一章不改其他章通过 reject → 重跑 → 再 approve 走。
- checkpoint 长期归档 / 多节点回滚：`reject` 的 `target_node` 只允许「当前审核点 || 上一个审核点」；completed 保留 7 天，磁盘超 500MB 告警但不阻断。
