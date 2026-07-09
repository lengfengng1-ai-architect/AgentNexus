## MODIFIED Requirements

### Requirement: Pipeline 状态同步

系统 SHALL 通过 SSE 事件流实时同步 pipeline 节点状态（running/complete/paused/failed）。

- 端到端状态：SSE 推送 workflow.start、node.start、node.complete、node.failed、workflow.paused、workflow.complete 事件
- 媒体状态：SSE 流结束后，视频/海报的异步生成状态通过独立轻量查询获得，不读 LangGraph checkpoint
- 前端 SHALL 使用 SSE 事件作为 pipeline 节点状态的唯一来源
- 前端 SHALL 使用轻量媒体状态查询（非 getPlanRunStatus）更新 outputs.poster 和 outputs.promo_video

#### Scenario: plan_generator 完成后的媒体状态轮询
- **WHEN** plan_generator 节点通过 SSE 推送 workflow.complete
- **AND** 视频/海报尚未完成（状态为 generating 或不存在）
- **THEN** 前端每 5 秒调用媒体状态端点查询最新状态
- **AND** 前端一次性更新 outputs.promo_video 和 outputs.poster，不触发 RESTORE_STATUS

#### Scenario: 侧边栏确认继续按钮
- **WHEN** workflow paused
- **AND** pausedSnapshot 非空
- **THEN** 侧边栏显示"确认继续"按钮和"驳回重跑"按钮
- **AND** PipelineTimeline 组件不显示重复的确认继续按钮
