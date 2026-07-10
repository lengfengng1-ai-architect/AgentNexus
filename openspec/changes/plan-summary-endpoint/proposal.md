## Why

移动端方案生成完成后，前端从 `outputs._strategy/_execution/_budget/_actions` 读取各 agent 原始输出来渲染卡片。但 `budget_kpi` agent 的 `kpis` 字段是 `dict[str, str]`（key 不固定），`allocations[].category` 也不稳定，导致同一组数据每次 LLM 输出的 key 名不同，前端渲染无法固定。需要用一个 LLM 结构化端点在服务端做归一化，输出固定字段给前端直接消费。

## What Changes

- 新增 `POST /plan/summary` 端点，接收 `run_id`，返回固定结构的方案摘要
- 后端从 checkpoint 读取已完成的 agent 输出（`strategy_generation` / `execution_planning` / `budget_kpi` / `action_recommendations` / `plan_generator`）
- 用 `with_structured_output` 调用 LLM，归一化为固定字段的 `PlanSummary` 对象
- 前端 `ScreenGenerate` 从依赖 `outputs._xxx` 改为调用此端点，直接渲染固定卡片数据
- `docs/api/paths/plan.yaml` 新增 `POST /plan/summary` 端点定义
- 新增 Pydantic model `PlanSummary` 及相关子 model

## Capabilities

### New Capabilities
- `plan-summary`: 方案摘要提炼，读取 checkpoint agent 输出，LLM 归一化为固定卡片结构

### Modified Capabilities
- `mobile-workbench-preview`: ScreenGenerate 的"生成结果"部分从直接读 `outputs._xxx` 改为调用摘要端点

## Impact

| 层面 | 影响 |
|------|------|
| 后端 API | 新增 `POST /plan/summary` 端点 |
| 后端 Service | 新增 `plan_summary_service.py`，包含 checkpoint 读取 + LLM 结构化调用逻辑 |
| 后端 Schemas | 新增 `PlanSummary` 及其子 model |
| 后端 Prompt | 新增 `plan_summary.md.j2` 模板 |
| 前端 ScreenGenerate | 生成结果卡片区从 `outputs._xxx` 改为调 `POST /plan/summary` 更新状态 |
| 前端 API | 新增 `getPlanSummary(runId)` 函数 |
| 规范 | 更新 `docs/api/paths/plan.yaml` |
