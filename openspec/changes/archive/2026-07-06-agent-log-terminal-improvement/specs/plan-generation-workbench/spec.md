# Delta Spec: plan-generation-workbench

## MODIFIED Requirements

### Requirement: `/plan` 右侧 SHALL 展示 Agent 流水线可视化

`/plan` 右侧 SHALL 以垂直时间线形式展示 `plan_generation_pipeline` 的 Agent 执行状态。流水线运行时 SHALL 自动执行到审核点前停下，无需前端主动 pause。每个 Agent 节点可展开查看执行日志，日志以终端风格（深色背景、等宽字体、竖滚）展示。

#### Scenario: 默认执行到审核点自动停
- **WHEN** 用户点击"开始生成方案"
- **THEN** Agent 节点 SHALL 自动按顺序执行
- **AND** 当前运行节点 SHALL 显示脉冲动画
- **AND** 到达 `strategy_generation` / `execution_planning` / `plan_generator` 前 SHALL 自动停下并展示审核面板

#### Scenario: 节点失败进入审核面板
- **GIVEN** 某个 Agent 节点执行失败
- **WHEN** 前端收到 `node.failed` 后紧跟 `workflow.paused` 事件（`reason: "failure"`）
- **THEN** 失败节点 SHALL 高亮显示
- **AND** SHALL 显示审核面板的"通过""改再通过""打回"按钮
- **AND** "通过"按钮 SHALL 默认 disabled（失败继续不安全）

#### Scenario: 审核点面板展示 snapshot
- **GIVEN** run 已在 `strategy_generation` 前暂停
- **WHEN** 前端收到 `workflow.paused` 事件（`reason: "review"`）
- **THEN** 审核面板 SHALL 展示 `snapshot` 中当前节点即将读取的所有字段
- **AND** SHALL 提供 JSON 编辑器供用户修改 patch
- **AND** SHALL 提供"通过"（不改动）/"改再通过"（带 patch）/"打回"（reject）三个按钮

## ADDED Requirements

### Requirement: 运行中的 Agent 节点日志面板 SHALL 自动展开

当 Agent 节点状态变为 `running` 时，PipelineTimeline 组件 SHALL 自动展开该节点的日志面板，让用户看到实时日志。

#### Scenario: 节点进入 running 状态自动展开
- **GIVEN** 当前无节点在运行
- **WHEN** 前端收到 `node.start` 事件
- **THEN** 该节点 SHALL 自动展开日志面板
- **AND** 用户 SHALL 仍可手动收起面板

### Requirement: Agent 节点展开面板 SHALL 以终端风格显示执行日志

展开面板中的日志区域 SHALL 使用深色背景（`#0f172a`）、等宽字体（monospace）、12px 字号。日志条目竖排，新日志自动滚动到底部。日志颜色按语义区分：开始蓝色、完成绿色、失败红色、等待黄色。

#### Scenario: 日志区域展示终端样式
- **WHEN** 用户展开任意已开始或已完成的 Agent 节点
- **THEN** 日志区域 SHALL 显示深色终端风格容器
- **AND** 日志条目颜色 SHALL 按语义着色
- **AND** 最新日志 SHALL 自动滚动到底部可见

### Requirement: 日志区域下方 SHALL 展示执行摘要

当 Agent 节点执行完毕（complete / paused），日志区域下方 SHALL 显示执行摘要，包含执行状态、耗时（从 startedAt 到 completedAt 计算）和日志总条数。

#### Scenario: 执行完成后显示摘要
- **GIVEN** 某 Agent 节点已执行完成
- **WHEN** 用户展开该节点查看日志
- **THEN** 日志区域下方 SHALL 显示摘要信息
- **AND** 摘要 SHALL 包含状态图标（✅ 或 ⏸）、执行结果、耗时、日志条数
- **AND** 摘要文本 SHALL 使用灰色 12px 字体
