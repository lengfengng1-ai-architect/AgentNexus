## Context

移动端方案生成流水线（`plan_generation_service.py`）当前使用 LangGraph 的 `interrupt_before` 机制在多个节点前暂停，弹出一个通用确认弹窗。该弹窗仅显示"即将执行：预算与 KPI"，不展示节点计算结果。

本次设计将 `budget_kpi` 从 `interrupt_before` 改为 `interrupt_after`，使暂停时 state 中已包含 budget_kpi 的输出结果，前端可读取并展示预算分配、KPI 指标等结构化数据。驳回重跑时，用户输入的新要求作为额外上下文注入 LLM prompt，让 LLM 重新生成。

## Goals / Non-Goals

**Goals:**
- budget_kpi 节点执行完成后的弹窗展示计算结果（总预算、分配、KPI、里程碑）
- 用户驳回重跑时，输入的新要求传递给 budget_kpi 的 LLM prompt 重新生成
- 驳回重跑的全过程记录后端日志（含用户输入的原因）
- 其他节点的 checkpoint 行为不变（仍用 interrupt_before）

**Non-Goals:**
- 不改动 PC 端（PipelineTimeline）的 checkpoint 逻辑
- 不引入新的 SSE 事件类型（复用已有的 workflow.paused/node.log）
- 不新增 API 端点（复用现有的 approve/reject 端点）
- 不修改 BudgetKpiOutput / ExecutionOutput schema

## Decisions

### Decision 1: budget_kpi 从 interrupt_before 改为 interrupt_after

**为什么用 interrupt_after 而不是在 interrupt_before 时从 checkpoint 读数据？**

interrupt_before 时 state 中还没有 budget_kpi 的输出。虽然可以从 checkpoint 拿上一次执行的结果，但驳回重跑后需要新结果——而 interrupt_after 天然使新结果立即可用。

**具体做法：**
- 新增 `_INTERRUPT_AFTER = ["budget_kpi"]`
- `_build_graph().compile()` 增加 `interrupt_after=_INTERRUPT_AFTER`
- `_stream_events` 的 paused 检测：当 next 为 `action_recommendations` 且 budget_kpi 在 `_INTERRUPT_AFTER` 中时，emit `workflow.paused` with `snapshot.node_id = "budget_kpi"`
- `_status_for_state` / `_paused_snapshot` 同理

### Decision 2: reject_run 回退 state 到 budget_kpi 之前

interrupt_after 暂停后，resume 会让图继续到 action_recommendations，不会重跑 budget_kpi。

**方案：**
1. 检测当前 paused at budget_kpi（interrupt_after 场景）
2. 清空 `channel_values["budget_kpi"]` 及下游（action_recommendations、plan_generator）
3. 注入 `brand_input["_reject_reason"] = reason`
4. `graph.update_state(as_node="budget_kpi")` — 将 LangGraph 的 `next` 重置为 budget_kpi
5. `Command(resume={})` 恢复执行 → LangGraph 发现 budget_kpi 输出已被清空，重新执行

### Decision 3: 驳回原因的 prompt 注入

在 `budget_kpi_agent.py` 的 `run_budget_kpi` 中从 `brand_input` 读取 `_reject_reason`，传入模板。

模板增加条件渲染：
```jinja2
{% if reject_reason %}
用户补充要求：{{ reject_reason }}
{% endif %}
```

前端传递路径：`rejectRun()` → `POST /plan/runs/{rid}/reject { reason: "..." }` → `reject_run()` 写入 `brand_input["_reject_reason"]` → resume → `run_budget_kpi` 读取

### Decision 4: 前端弹窗差异化渲染

`ScreenGenerate.tsx` 中现有弹窗是所有 paused 节点共用的。通过在渲染时判断 `pausedSnapshot.node_id === 'budget_kpi'`，分别走两套渲染：

- **通用弹窗**（其他节点）：保持现有样式不变
- **budget_kpi 弹窗**：从 `pausedSnapshot.upstream_outputs.budget_kpi` 读取结果，展示：
  - 总预算 / 执行周期
  - 预算分配列表（category × amount × percentage）
  - KPI 指标
  - 关键里程碑

弹窗容器改为 `max-height: 70vh` + 可滚动。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| `update_state(as_node="budget_kpi")` 破坏 checkpoint 链 | `as_node` 不是回溯 graph，而是设置 `next`。使用前确认 checkpoint 非空 |
| 驳回重跑时下游节点（action_recommendations）输出未清空导致冲突 | 明确清空 budget_kpi、action_recommendations、plan_generator 三个 channel_values 键 |
| `_INTERRUPT_AFTER` 与其他节点配置冲突 | 仅 budget_kpi 使用 interrupt_after，其他节点保持 interrupt_before，两者可共存 |
| 弹窗内容太长影响移动端体验 | 使用 `max-height: 70vh` + overflow-y: auto，可滚动查看 |
