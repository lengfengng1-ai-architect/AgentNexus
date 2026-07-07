## ADDED Requirements

### Requirement: 节点执行前暂停(Confirm-before-run)

从 `plan_data_query` 起,每个节点(plan_data_query / fitness_analysis / strategy_generation / execution_planning / budget_kpi / action_recommendations / plan_generator)SHALL 在执行前暂停等待用户「确认继续」。暂停点的 `snapshot.node_id` MUST 是即将执行的节点。

#### Scenario: 数据查询节点显示确认按钮
- **WHEN** 3 个并行调研节点全部完成,图即将进入 plan_data_query
- **THEN** 发出 workflow.paused,node_id = plan_data_query,前端在该节点显示「确认继续」按钮

#### Scenario: 确认后状态立即更新
- **WHEN** 用户点击「确认继续」
- **THEN** 该节点徽章从「等待确认」变为「执行中」(isPaused && !isRunning 守卫)

### Requirement: 并行 fan-in 节点 pause 前校验前置完成

系统在发出 workflow.paused 之前,对于并行 fan-in 节点(plan_data_query),SHALL 校验其所有并行前置节点(product_research / market_research / audience_insight)的 channel 输出都已存在。若任一前置未完成,DEFER 该 pause 事件。

#### Scenario: 并行未完成时不提前 pause
- **WHEN** plan_data_query 被设为 next 但 3 个并行前置中尚有未完成
- **THEN** 不发 workflow.paused,前端继续通过 node.complete 自然收敛

### Requirement: Resume 不重跑已完成节点

`Command(resume={})` 触发的 entry point 重入 SHALL 跳过 channel 已有输出的并行节点,避免已完成节点被再次执行。

#### Scenario: 确认 plan_data_query 不重跑并行调研
- **WHEN** 用户确认 plan_data_query,resume 触发 _dispatch_init
- **THEN** 已完成的 product_research/market_research/audience_insight 不被重新 Send,plan_data_query 直接执行

### Requirement: workflow.complete 守卫

发出 workflow.complete 之前,系统 SHALL 校验 `output.plan_generator.chapters` 存在且非空。若缺失则不发 complete(降级为后续 paused 处理),防止 action 卡片在 plan_generator 未完成时提前显示。

#### Scenario: plan_generator 未完成不误发 complete
- **WHEN** LangGraph on_chain_end 触发但 plan_generator 输出缺失
- **THEN** 不发 workflow.complete,前端 action 卡片守卫(planGeneratorDone)隐藏卡片

## MODIFIED Requirements

无显式修改;上述为新增要求。原 interrupt_after 相关行为已被 interrupt_before 替代,语义变化在 design.md 记录。
