## Why

移动端方案生成流水线中，budget_kpi 节点当前使用通用 checkpoint 弹窗（执行前暂停，仅显示"即将执行"）。用户希望在确认前看到 budget_kpi 的计算结果（预算分配、KPI 指标等），并可驳回重跑（输入补充要求后让 LLM 重新生成），直到满意才继续流程。

## What Changes

- **budget_kpi 从 interrupt_before 改为 interrupt_after**：使暂停时 budget_kpi 的结果已写入 state，弹窗可直接展示
- **弹窗差异化渲染**：只有 budget_kpi 节点暂停时展示结果富内容弹窗，其他节点保持原有通用样式
- **驳回重跑增强**：用户驳回时，输入的新要求作为额外上下文注入 budget_kpi LLM prompt，让 LLM 按新要求重新生成
- **后端日志**：记录用户驳回 budget_kpi 的原因，以及重跑时的补充要求

## Capabilities

### New Capabilities

（无新 capability，均为已有 capability 的增强实现）

### Modified Capabilities

- `plan-generation-pipeline`: budget_kpi 节点从 `interrupt_before` 改为 `interrupt_after`，暂停语义变化
- `agent-confirm-dialog`: budget_kpi 节点的确认弹窗展示结果内容，而非仅"即将执行"的通用文案

## Impact

| 文件 | 变更类型 |
|------|----------|
| `backend/app/services/plan_generation_service.py` | 修改 - interrupt_before → interrupt_after + reject_run 重跑逻辑 |
| `backend/app/agents/budget_kpi_agent.py` | 修改 - 读取并传递 `_reject_reason` |
| `backend/app/prompt_templates/budget_kpi.md.j2` | 修改 - 增加 `reject_reason` 条件渲染 |
| `frontend/src/pages/mobile-workbench/ScreenGenerate.tsx` | 修改 - budget_kpi 弹窗差异化渲染 |
