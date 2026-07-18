# Capability: budget-analysis

## Purpose

提供预算评估能力：通过多轮澄清收集四个预算字段（category / budget / period / city），基于 mock 预算模板计算 5 类预算分配与 KPI 预估，结果持久化为 JSON 并按 ID 拉取；移动端通过聊天入口卡和毛玻璃详情页展示完整结果。仅输出规划建议，不执行真实花费、下单或支付。

## Requirements

### Requirement: 预算评估 SHALL 通过多轮澄清收集四个字段

预算评估 SHALL 收集 category（品类/产品）、budget（预算，万元）、period（周期，月）、city（城市）四个字段。字段缺失时 SHALL 通过 clarify 反问，复用现有意图识别的多轮机制。字段齐全后方可执行预算计算。

#### Scenario: 字段缺失时反问
- **GIVEN** 用户触发预算评估但四个字段有缺失
- **WHEN** 意图识别处理用户输入
- **THEN** intent SHALL 为 clarify
- **AND** reply SHALL 反问缺失的字段
- **AND** 已提供的字段 SHALL 保留在 brand_input

#### Scenario: 字段齐全触发预算评估
- **GIVEN** category/budget/period/city 四字段已收集齐全
- **WHEN** 意图识别处理用户输入
- **THEN** intent SHALL 为 budget_assessment
- **AND** SHALL 触发预算计算（而非 generate_plan 全量流水线）

### Requirement: 预算评估 SHALL 结合 mock 数据生成预算分配与 KPI 预估

字段齐全后 SHALL 基于 mock 预算模板（`plan_budget_kpi.json`）计算：allocations（5 类：达人合作/内容制作/活动执行/平台投放/运营资源，固定模板百分比 × 用户预算）、KPI 预估（base KPI × 用户预算/模板预算 比例缩放）、timeline（按 period 月数）。城市字段 SHALL 用于关联城市 mock 数据（MVP 不改变分配比例，预留扩展）。

#### Scenario: allocations 按模板百分比 × 用户预算
- **GIVEN** 用户提供 budget=100 万、period=2 月、category=运动鞋、city=上海
- **WHEN** 计算预算分配
- **THEN** 5 类 allocation SHALL 使用固定模板百分比（30/15/25/20/10）
- **AND** amount SHALL 为百分比 × 100 万（达人合作 30 万等）

#### Scenario: KPI 按预算比例缩放
- **GIVEN** 用户预算与模板预算（200 万）不同
- **WHEN** 计算 KPI 预估
- **THEN** KPI SHALL 按 用户预算/模板预算 比例缩放 base KPI

#### Scenario: 一句话建议由 LLM 基于数据生成
- **GIVEN** allocations 与 KPI 计算完成
- **WHEN** 生成一句话建议
- **THEN** SHALL 由 LLM 基于 allocations 数据推理生成
- **AND** SHALL NOT 编造厂商/赛事/达人名称或数据数值（仅基于已有数据推理）

### Requirement: 预算评估结果 SHALL 持久化并按 ID 拉取

预算评估完成 SHALL 将完整结果持久化为 JSON 文件（`budget_analysis/results/ba-<uuid8>.json`），并返回 `budget_assessment_id`。详情页 SHALL 通过 `GET /budget-analysis/results/{id}` 按 ID 拉取，刷新后仍可用。

#### Scenario: 结果落盘并返回 ID
- **GIVEN** 预算评估计算完成
- **WHEN** SSE 推送 result 事件
- **THEN** 结果 SHALL 先写入 ba-\<uuid8\>.json
- **AND** result 事件 SHALL 携带 budget_assessment_id

#### Scenario: 按 ID 拉取详情
- **GIVEN** 用户打开详情页
- **WHEN** 前端调用 GET /budget-analysis/results/{id}
- **THEN** SHALL 返回完整预算评估结果
- **AND** 无效 ID 或不存在 SHALL 返回 404

### Requirement: 移动端 SHALL 在聊天展示预算评估入口卡

预算评估完成后，聊天 SHALL 展示 `BudgetAssessmentEntryCard`：迷你预算分配条形图 + KPI 预估数字 + 一句话建议 + "查看预算详情"按钮。点击按钮 SHALL 打开详情覆盖屏。

#### Scenario: 入口卡渲染
- **GIVEN** 预算评估完成且消息携带 budget_assessment_id
- **WHEN** ChatBubble 渲染
- **THEN** SHALL 展示 BudgetAssessmentEntryCard（条形图 + KPI + 建议 + 按钮）
- **AND** SHALL NOT 直接铺开完整报告

#### Scenario: 点击按钮打开详情页
- **GIVEN** 用户点击"查看预算详情"
- **WHEN** 触发跳转
- **THEN** SHALL 打开从右往左滑入的详情覆盖屏（slide-in-right）
- **AND** 覆盖屏 SHALL 按 budget_assessment_id 拉取并展示完整结果

### Requirement: 预算评估详情页 SHALL 以毛玻璃风格展示完整结果

详情覆盖屏 SHALL 复用调研结果页模式：sticky 毛玻璃顶栏 + 长滚动内容。内容包含完整预算分配图、KPI 栅格、时间线、一句话建议。刷新页面后 SHALL 通过持久化 ID 重新拉取。

#### Scenario: 详情页结构
- **GIVEN** 用户在预算评估详情页
- **WHEN** 渲染
- **THEN** SHALL 展示毛玻璃顶栏（返回按钮 + 标题）+ 完整预算分配可视化 + KPI 栅格 + timeline + 建议

#### Scenario: 刷新后仍可访问
- **GIVEN** 用户刷新详情页
- **WHEN** 重新加载
- **THEN** SHALL 通过 budget_assessment_id 从后端重新拉取结果
- **AND** 结果存在则正常展示

### Requirement: 预算评估 SHALL 仅输出建议，不执行花费

预算评估 SHALL 只输出规划建议（分配/KPI/建议），SHALL NOT 自动花钱、下单、或执行任何预算动作。

#### Scenario: 不执行真实花费
- **GIVEN** 预算评估完成
- **THEN** SHALL NOT 调用任何支付/下单/执行类 API
- **AND** 输出仅为建议性质
