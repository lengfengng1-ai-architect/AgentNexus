---
capability: plan-summary
name: 方案摘要提炼
description: POST /plan/summary - 读取 checkpoint agent 输出，LLM 归一化为固定卡片结构
---

## ADDED Requirements

### Requirement: 方案摘要端点可接受 run_id 并返回结构化卡片数据

系统 SHALL 提供 POST /plan/summary 端点，接收 run_id，返回固定结构的方案摘要。

#### Scenario: 正常请求
- **WHEN** 请求体包含有效的 run_id
- **THEN** 系统 SHALL 从 checkpoint 读取已完成 agent 的输出
- **AND** 用 LLM with_structured_output 提炼为 PlanSummary 结构
- **AND** 返回 200 响应含 strategy/kpis/allocations/execution/actions 字段

#### Scenario: run_id 不存在
- **WHEN** run_id 在 checkpoint 中不存在
- **THEN** 系统 SHALL 返回 404

### Requirement: PlanSummary 结构包含 5 个固定卡片

系统 SHALL 返回包含策略定位、KPI、预算分配、执行规划、行动建议的固定结构。

#### Scenario: 各卡片字段说明
- **WHEN** 返回 PlanSummary 对象
- **THEN** strategy 字段 SHALL 包含 positioning（string）和 key_messages（string[]）
- **AND** kpis 字段 SHALL 是 KpiItem 数组（name/target/unit）
- **AND** allocations 字段 SHALL 是 AllocationItem 数组（category/percentage/amount）
- **AND** execution 字段 SHALL 是 ExecutionItem 数组（label/description）
- **AND** actions 字段 SHALL 是 ActionItem 数组（title/description）

### Requirement: LLM 智能纠偏

系统 SHALL 在提炼时传入 brand_input 作为参考，LLM 可修正 agent 输出中的明显偏差。

#### Scenario: total_budget 为 0 时取 brand_input.budget
- **WHEN** checkpoint 中 budget_kpi.total_budget 为 0 且 brand_input.budget 有值
- **THEN** LLM SHALL 使用 brand_input.budget 修正 total_budget
- **AND** allocations 中的 amount 和 percentage SHALL 基于修正后的预算重新计算

### Requirement: 前端完成态调用摘要端点渲染卡片

系统 SHALL 使 ScreenGenerate 在 status=completed 时调用 POST /plan/summary，用返回数据替换直接读 outputs._xxx 的渲染逻辑。

#### Scenario: 完成时自动加载摘要
- **WHEN** status 变为 completed
- **THEN** 系统 SHALL 调用 POST /plan/summary 带 run_id
- **AND** 加载期间 SHALL 显示加载态骨架屏
- **AND** 成功后 SHALL 用 PlanSummary 数据渲染卡片
- **AND** 失败时 SHALL 降级为直接读 outputs._xxx（现有逻辑）
