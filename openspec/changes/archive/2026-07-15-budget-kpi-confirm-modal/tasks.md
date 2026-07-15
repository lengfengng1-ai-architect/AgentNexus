## 1. 后端核心变更 — interrupt_before → interrupt_after

- [x] 1.1 在 `_INTERRUPT_BEFORE` 中移除 `"budget_kpi"`，新增 `_INTERRUPT_AFTER` 列表
- [x] 1.2 `_build_graph().compile()` 增加 `interrupt_after=_INTERRUPT_AFTER`
- [x] 1.3 `_stream_events` 中的 paused 检测逻辑：当 next 为 `action_recommendations` 且 `budget_kpi` 在 `_INTERRUPT_AFTER` 中时，emit `workflow.paused` with `snapshot.node_id = "budget_kpi"`
- [x] 1.4 `_status_for_state` / `_paused_snapshot` 适配 `_INTERRUPT_AFTER` 检测

## 2. 后端核心变更 — reject_run budget_kpi 重跑逻辑

- [x] 2.1 在 `reject_run` 中判断当前 paused 节点是否为 budget_kpi（interrupt_after 场景）
- [x] 2.2 清空 `channel_values["budget_kpi"]`、`channel_values["action_recommendations"]`、`channel_values["plan_generator"]`
- [x] 2.3 注入 `brand_input["_reject_reason"] = reason`
- [x] 2.4 调用 `graph.update_state(as_node="budget_kpi")` 回退 state
- [x] 2.5 用 `Command(resume={})` 恢复执行

## 3. 后端日志记录

- [x] 3.1 在 `reject_run` 中增加 `logger.info("[plan] 用户驳回 budget_kpi，原因：%s", reason)`
- [x] 3.2 在 `run_budget_kpi` 中读取 `_reject_reason`，有值时调用 `write_log("budget_kpi", "📝 用户补充要求：{reason}")`

## 4. Prompt 模板修改

- [x] 4.1 在 `budget_kpi.md.j2` 输入信息区域末尾增加 `{% if reject_reason %}用户补充要求：{{ reject_reason }}{% endif %}`
- [x] 4.2 在 `run_budget_kpi` 函数中从 `brand_input` 读取 `_reject_reason`，传递给模板

## 5. 前端弹窗差异化渲染

- [x] 5.1 在 `ScreenGenerate.tsx` 中判断 `pausedSnapshot.node_id === 'budget_kpi'` 时展示结果弹窗
- [x] 5.2 从 `upstream_outputs.budget_kpi` 提取并展示：total_budget、period_months、allocations[]、kpis{}、timeline[]
- [x] 5.3 弹窗容器改为 `max-height: 70vh` + `overflow-y: auto`
- [x] 5.4 其他节点保持原有通用弹窗不变
