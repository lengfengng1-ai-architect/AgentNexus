# 移动端预算KPI确认弹窗 — Design Doc

## 背景

移动端方案生成流水线（ScreenGenerate）中，现有 checkpoint 机制会在每个 `_INTERRUPT_BEFORE` 配置的节点执行前暂停，弹出一个通用确认弹窗。针对 `budget_kpi` 节点，需要改为**执行后暂停**，在弹窗中展示预算KPI的结果，并支持用户驳回重跑。

## 架构变更

核心变更：将 `budget_kpi` 从 `interrupt_before` 改为 `interrupt_after`，使暂停时节点的计算结果已写入 state，弹窗可直接读取展示。

## 后端改动

### 1. `_INTERRUPT_BEFORE` → `_INTERRUPT_AFTER`

位置：`plan_generation_service.py`

- 将 `"budget_kpi"` 从 `_INTERRUPT_BEFORE` 列表中移除
- 新增 `_INTERRUPT_AFTER = ["budget_kpi"]`
- `_build_graph().compile()` 新增 `interrupt_after=_INTERRUPT_AFTER`

### 2. `_status_for_state` / `_paused_snapshot` 适配 interrupt_after

位置：`plan_generation_service.py`

- 判断 paused 时同时检查 `_INTERRUPT_BEFORE` 和 `_INTERRUPT_AFTER`
- `interrupt_after` 时 `upstream_outputs` 中已有 `budget_kpi` 结果，前端可直接读取 `snapshot.upstream_outputs.budget_kpi`

### 3. `reject_run` 增加 budget_kpi 重跑逻辑

位置：`plan_generation_service.py`

当前 `reject_run` 仅在 `brand_input` 注入 `_reject_reason`，然后用 `Command(resume={})` 恢复执行。对于 `interrupt_after` 场景，需要清空 `budget_kpi` 及其下游（`action_recommendations`、`plan_generator`）的输出，否则 LangGraph 检测到输出已存在会跳过重跑。

步骤：
1. 清空 `channel_values["budget_kpi"]` 及下游节点输出
2. 注入 `brand_input["_reject_reason"] = reason`
3. 调用 `graph.update_state(as_node="budget_kpi")` 回退到 budget_kpi 之前
4. `Command(resume={})` 恢复执行

### 4. budget_kpi prompt 模板增加驳回反馈

位置：`prompt_templates/budget_kpi.md.j2`

在输入信息区域末尾增加：
```
{% if reject_reason %}
用户补充要求：{{ reject_reason }}
{% endif %}
```

位置：`budget_kpi_agent.py`

`run_budget_kpi` 增加从 `brand_input` 读取 `_reject_reason` 的逻辑，传递给模板。

### 5. 后端日志

位置：`reject_run` 中增加日志：
```python
logger.info("[plan] 用户驳回 budget_kpi，原因：%s", reason)
```

`budget_kpi_agent.py` 中 `run_budget_kpi` 在有 `_reject_reason` 时增加 write_log：
```
write_log("budget_kpi", f"📝 用户补充要求：{reject_reason}")
```

## 前端改动

位置：`ScreenGenerate.tsx`

1. 检测 `pausedSnapshot.node_id === 'budget_kpi'` 时展示结果弹窗
2. 从 `pausedSnapshot.upstream_outputs.budget_kpi` 提取：
   - `total_budget` + `period_months`
   - `allocations[]` 类别 × 金额 × 占比
   - `kpis` 字典渲染
   - `timeline[]` 列表
3. 弹窗 container 的 `height` 改为 `max-height` + 可滚动
4. 驳回重跑流程不变（textarea → 输入原因 → 调用 reject API）
5. 其他节点的弹窗保持原有通用样式

## 不变的部分

- 前端 `useMobilePlanRun` hook 的 SSE 事件处理不变
- `approve_run` / `rerun_run` 逻辑不变
- 流水线其他节点（`plan_data_query` ~ `action_recommendations`）的 checkpoint 行为不变
- `BudgetKpiOutput` / `ExecutionOutput` schema 不变

## 驳回重跑数据流

```
用户点击"驳回重跑" → textarea 输入新要求
→ 调用 POST /plan/runs/{run_id}/reject { reason: "减少赛事投入" }
→ 后端 reject_run:
   1. logger.info("[plan] 用户驳回 budget_kpi，原因：减少赛事投入")
   2. 清空 budget_kpi / action_recommendations / plan_generator 输出
   3. 注入 _reject_reason → brand_input
   4. 回退 state → budget_kpi 重新执行
   5. budget_kpi agent 读 reject_reason → write_log
   6. LLM 按新要求重新生成
→ SSE 推送节点重新执行的事件
→ 前端展示新的结果弹窗
→ 用户可循环直到点击"确认继续"
```
