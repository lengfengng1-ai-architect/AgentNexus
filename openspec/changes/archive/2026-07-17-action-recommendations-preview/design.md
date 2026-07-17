## Context

移动端方案生成流水线中，前 9 个 Agent 串行执行，其中 budget_kpi 已有 `interrupt_after` 的结果弹窗+预算预览模式。本轮扩展将此模式复制到 action_recommendations 节点：执行完后暂停展示行动建议，用户可在全屏覆盖层中预览每项建议的标题/描述/日期/优先级/分类，查看媒体素材状态，并通过底部输入栏发送修改意见触发驳回重跑。

## Goals / Non-Goals

**Goals:**
- action_recommendations 执行完后弹出结果弹窗（同 budget_kpi 模式）
- 点击"行动预览"滑入全屏覆盖层展示行动建议卡片
- 覆盖层带品牌摘要、行动列表（含日期/优先级/分类标签）、媒体素材状态
- 底部输入栏提交反馈 → 驳回重跑 action_recommendations
- 海报生成提前到 action_recommendations 阶段发起（和视频并行）
- ActionItem schema 扩展 start_date/end_date/priority/category
- reject_run 区分 action_recommendations 驳回和 budget_kpi 驳回

**Non-Goals:**
- 不修改 PC 端 PlanPage 或 PipelineTimeline
- 不修改 budget_kpi 预算预览的现有行为
- 不涉及方案预览屏（ScreenPreview）的改动

## Decisions

1. **复用 budget-preview 模式**：`MobileWorkbenchPage` 中新增 `action-preview` screen 类型，用 `suppressedPausedNodeId` 跟踪被抑制的节点 ID，确保用户返回 generate 屏时弹窗不重复弹出。不新建独立路由。

2. **ScreenActionPreview 自包含组件**：行动预览覆盖层独立为 `ScreenActionPreview.tsx`，Props 接收 actions/brandName/category/budget 等展示数据，onApprove/onReject/onBack 作为回调。与 `ScreenBudgetPreview` 同级，不依赖父组件逻辑。

3. **后端 reject 分支逻辑**：`reject_run()` 中通过 `next_nodes` 判断当前暂停节点。action_recommendations 驳回只清 `action_recommendations` + `plan_generator`，回滚到 `budget_kpi`（保留预算数据），避免 prompt 模板中的 `reject_reason` 误触发预算/周期修改。

4. **海报触发时机提前**：原逻辑是 `plan_generator` 完成后才发海报生成请求，导致 action_recommendations checkpoint 时看不到海报状态。改到 `action_recommendations` 节点完成时和视频并行触发（`plan_generator` 完成后用完整 chapters 内容再次触发覆盖）。

5. **修改历史编号**：`_reject_history` 数组记录每次驳回，模板中用 `第{i}次修改：{reason}` 逐行展示，保证多次修改不丢失上下文。

## Risks / Trade-offs

- `reject_run` 的 `as_node` 依赖 LangGraph 图的边拓扑结构（`budget_kpi → action_recommendations → plan_generator`）。如果未来图结构变化，需要同步更新回滚逻辑。
- 海报提前触发用的是 `strategy_generation` 的定位文字（非完整 chapters），质量不如 `plan_generator` 后的完整内容版。`plan_generator` 完成后会再次触发覆盖，但存在短暂过渡。
