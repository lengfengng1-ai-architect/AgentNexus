---
capability: mobile-brief-connect
name: 移动端简报与后端打通
description: 移动端②简报屏表单提交、AI策略优化、触发agent工作流；③方案生成屏SSE驱动流水线与CP审核
---

## ADDED Requirements

### Requirement: ② 简报屏表单为 controlled state 并支持数据提交

系统 SHALL 使 ScreenBrief 中的所有表单字段（品牌、产品线、目标人群、营销目标、投放周期、首批城市、核心策略）从 uncontrolled defaultValue 变更为 controlled useState 管理。

#### Scenario: 用户修改表单字段后 state 同步更新
- **WHEN** 用户修改任一表单字段的值
- **THEN** 对应 state SHALL 同步更新
- **AND** 字段的 input/select/textarea SHALL 显示最新值

#### Scenario: 用户点击城市 chip 多选
- **WHEN** 用户点击某个城市 chip
- **THEN** 该 chip SHALL 切换选中态
- **AND** selectedCities state SHALL 同步更新

### Requirement: 核心策略字段支持 AI 优化填写

系统 SHALL 在 ScreenBrief 的核心策略 textarea 旁提供一个 AI 生成图标按钮，点击后调用后端 `POST /plan/strategy-optimize` 端点，将结果填充到 textarea。

#### Scenario: 用户点击 AI 优化策略按钮
- **WHEN** 用户在简报屏点击核心策略字段旁的 AI 图标按钮
- **THEN** 按钮 SHALL 显示 loading 态
- **AND** 系统 SHALL 调用 `POST /plan/strategy-optimize`，携带当前表单数据
- **AND** 成功后 SHALL 将返回的策略文案填充到核心策略 textarea
- **AND** 按钮 SHALL 恢复常态
- **AND** 失败时 SHALL 在界面显示错误提示

### Requirement: "AI 生成方案"按钮触发生成流水线

系统 SHALL 使 ScreenBrief 的吸底"✦ AI 生成方案"按钮点击后，收集表单数据构造 brand_input，跳转到 ③ 方案生成屏并启动 agent 工作流。

#### Scenario: 用户点击 AI 生成方案
- **WHEN** 用户点击吸底"✦ AI 生成方案"按钮
- **THEN** 系统 SHALL 校验品牌和产品线字段非空
- **AND** 构造 brand_input（含所有表单字段）
- **AND** Tab 切换器 SHALL 切换到 ③ 方案生成
- **AND** 系统 SHALL 调用 POST /plan/run 启动流水线
- **AND** 方案生成屏 SHALL 立即显示流水线起始状态

#### Scenario: 品牌/产品线为空时拒绝提交
- **WHEN** 品牌为空且用户点击生成方案按钮
- **THEN** 系统 SHALL 显示"请填写品牌名称"提示
- **AND** 不跳转到方案生成屏
- **AND** 不触发流水线

### Requirement: ③ 方案生成屏通过 SSE 事件驱动流水线状态

系统 SHALL 在 ③ 方案生成屏通过 `useMobilePlanRun` hook 消费 `POST /plan/run` 的 SSE 流，动态更新每个 Agent 节点的状态（pending / running / completed / failed）。

#### Scenario: 流水线启动后节点状态逐步更新
- **WHEN** SSE 收到 `node.start` 事件
- **THEN** 对应节点 SHALL 显示为 running 态（旋转/脉冲动画）
- **WHEN** SSE 收到 `node.complete` 事件
- **THEN** 对应节点 SHALL 显示为 completed 态（✓ 标记）
- **WHEN** SSE 收到 `node.failed` 事件
- **THEN** 对应节点 SHALL 显示为 failed 态（✗ 标记 + 错误消息）
- **AND** 流水线 SHALL 停止

### Requirement: Agent 节点可点击展开/收起操作日志

系统 SHALL 使任一 Agent 节点可点击，点击后该节点下方自然滑出操作日志卡片，再点击同一节点日志卡片收回。

#### Scenario: 点击节点展开日志
- **WHEN** 用户点击某个 Agent 节点区域
- **THEN** 该节点的父元素 `.step` 高度 SHALL 增大，节点下方 SHALL 滑出操作日志卡片
- **AND** 日志卡片 SHALL 使用 `--surface`（`#f7f8fa`）轻灰底色 + `--border` 描边 + `--r-md` 圆角
- **AND** 日志 SHALL 使用 emoji 前缀、11px sans-serif 字体
- **AND** 连接各节点的竖线（`.step::before`）SHALL 自动随父元素高度拉长

#### Scenario: 当前执行中的节点自动展开日志
- **WHEN** SSE 收到 `node.start` 事件且该节点变为 running 态
- **THEN** 该节点 SHALL 自动展开操作日志卡片
- **AND** 日志内容 SHALL 自动滚动至最新一条
- **WHEN** 该节点变为 completed 态
- **THEN** 日志卡片 SHALL 保留为展开状态（手动收起）

#### Scenario: 点击节点收回日志
- **WHEN** 用户再次点击已展开日志的同一 Agent 节点
- **THEN** 日志卡片 SHALL 向上滑回收起
- **AND** `.step` 高度 SHALL 恢复至仅显示节点标题行
- **AND** 竖线（`.step::before`）SHALL 自动缩短至新高度

### Requirement: 方案生成完成后展示方案内容

系统 SHALL 在流水线完成后，将 plan_generator 输出的 chapters 渲染为方案内容卡片。

#### Scenario: 方案内容渲染
- **WHEN** SSE 收到 `workflow.complete` 事件且 outputs 包含 plan_generator.chapters
- **THEN** 流水线步骤下方 SHALL 渲染方案内容区域
- **AND** 内容区域 SHALL 显示策略定位、赛事体系、KPI 等卡片（从 chapters 中解析展示）
- **AND** 底部 SHALL 显示渐变 CTA「下一步行动建议」跳转到 ④ 屏

### Requirement: 移动端支持 checkpoint 暂停审核

系统 SHALL 在 ③ 方案生成屏收到 `workflow.paused` 事件时，弹出全屏模态审核面板。

#### Scenario: 流水线暂停时展示审核面板
- **WHEN** SSE 收到 `workflow.paused` 事件
- **THEN** 流水线 SHALL 在对应节点显示"等待确认"状态
- **AND** 底部 SHALL 上滑弹出全屏模态面板
- **AND** 面板 SHALL 展示当前暂停节点的名称和说明
- **AND** 面板 SHALL 展示上游已完成节点的摘要
- **AND** 面板底部 SHALL 包含两个按钮：「✓ 确认继续」(primary) 和「✕ 驳回重跑」(secondary)

#### Scenario: 用户确认继续
- **WHEN** 用户在审核面板点击「✓ 确认继续」
- **THEN** 系统 SHALL 调用 `POST /plan/runs/{run_id}/approve`
- **AND** 面板 SHALL 关闭
- **AND** 节点 SHALL 恢复为 running 态
- **AND** 流水线 SHALL 继续接收 SSE 事件

#### Scenario: 用户驳回重跑
- **WHEN** 用户在审核面板点击「✕ 驳回重跑」
- **THEN** 系统 SHALL 在面板内展开输入框让用户输入驳回原因
- **AND** 用户输入原因后点击确认
- **AND** 系统 SHALL 调用 `POST /plan/runs/{run_id}/reject`
- **AND** 面板 SHALL 关闭
- **AND** 节点 SHALL 恢复为 running 态重新执行

## MODIFIED Requirements

### Requirement: ② 简报屏展示方案头与品牌需求表单

> 以下为更新后的完整 requirement，替换原有移动端预览 P1 的占位行为。

系统 SHALL 在 ② 简报屏展示方案渐变头部 + 品牌需求表单（品牌/产品线/目标人群/营销目标/投放周期/首批城市/核心策略），表单字段预填自设计稿 mock 数据，且所有字段为 controlled state。

#### Scenario: ② 简报屏的视觉布局
- **WHEN** Tab 切换到 ② 简报
- **THEN** 手机框架内 SHALL 渲染渐变方案头（品牌、产品名、产品矩阵标签、规格/价位/周期元数据）
- **AND** 方案头下方 SHALL 显示"方案简报"标题
- **AND** 简报表单 SHALL 显示 7 个字段（品牌/产品线/目标人群/营销目标/投放周期/首批城市/核心策略），每个字段预填设计稿的 mock 数据
- **AND** 吸底显示"✦ AI 生成方案"按钮

#### Scenario: 城市 chips 可点击多选
- **WHEN** 用户点击城市 chip（如"成都"）
- **THEN** chip SHALL 切换选中态（灰色 ↔ 蓝色高亮）
- **AND** 已选城市数组 SHALL 更新
- **WHEN** 用户再次点击已选城市 chip
- **THEN** chip SHALL 取消选中态

#### Scenario: 用户点击 AI 生成方案按钮
- **WHEN** 用户点击吸底"✦ AI 生成方案"按钮
- **THEN** 系统 SHALL 校验品牌字段非空
- **AND** 构造 brand_input（含所有表单字段）
- **AND** Tab 切换器 SHALL 切换到 ③ 方案生成
- **AND** 系统 SHALL 调用 POST /plan/run 启动流水线

### Requirement: ③ 方案生成屏展示 Agent 流水线与方案结果

> 以下为更新后的完整 requirement，替换原有移动端预览 P1 的 mockup 行为。

系统 SHALL 在 ③ 方案生成屏展示 10 步 Agent 流水线状态（含描述短句）+ 可点击展开的操作日志 + 方案内容 + 底部 CTA。

#### Scenario: ③ 方案生成屏的视觉布局
- **WHEN** Tab 切换到 ③ 方案生成
- **THEN** 手机框架内 SHALL 渲染"方案生成"标题
- **AND** 流水线区域 SHALL 显示 10 个 Agent 节点（产品调研、市场调研、人群洞察、数据查询、适配度分析、策略生成、执行规划、预算 KPI、行动建议、方案生成）
- **AND** 每个节点标题下方 SHALL 显示一行描述短句（空闲态为静态文案如"搜索并分析品牌产品信息与市场定位"）
- **AND** 每个节点 SHALL 初始显示 pending 态（灰色）
- **AND** 底部无 CTA（流水线完成前关闭）
- **WHEN** 流水线完成且方案内容可用
- **THEN** 节点区域下方 SHALL 渲染方案内容卡片
- **AND** 底部 SHALL 显示蓝色渐变 CTA「下一步行动建议」

#### Scenario: 点击节点展开/收起操作日志
- **WHEN** 用户点击某个 Agent 节点
- **THEN** 该节点下方 SHALL 滑出操作日志卡片
- **AND** 连接竖线 SHALL 自动跟随高度变化
- **WHEN** 用户再次点击同一节点
- **THEN** 日志卡片 SHALL 收回，竖线恢复原高度
- **WHEN** 当前节点处于 running 态
- **THEN** 该节点 SHALL 自动展开日志卡片

#### Scenario: 描述短句随节点状态变化
- **WHEN** 节点为 pending 态
- **THEN** 描述短句 SHALL 显示静态文案（如"搜索并分析品牌产品信息与市场定位"）
- **WHEN** 节点变为 running 态
- **THEN** 描述短句 SHALL 替换为最新一条操作日志摘要（如"正在用4个关键词并行搜索…"）
- **WHEN** 节点变为 completed 态
- **THEN** 描述短句 SHALL 固定为总结性描述（如"搜索完成，获得12条相关结果"）

#### Scenario: 流水线暂停时显示审核面板
- **WHEN** SSE 收到 workflow.paused 事件
- **THEN** 对应节点 SHALL 显示"等待确认"状态
- **AND** 全屏审核面板 SHALL 弹出
