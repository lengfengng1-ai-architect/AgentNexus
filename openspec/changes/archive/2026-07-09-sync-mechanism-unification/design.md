## Context

PlanPage 当前同时依赖两套机制维护 pipeline 状态：
1. SSE 事件流在 start/approve/rerun 时建立，推送 node.start/complete/paused 事件，processEvent -> reducer dispatch
2. refreshStatus 轮询每 5 秒调用 getPlanRunStatus，全量读 LangGraph checkpoint，返回 RESTORE_STATUS 覆盖节点状态

轮询的唯一存在理由：视频（promo_video）和海报（poster）是后台 asyncio.create_task 异步生成的，SSE 流在 plan_generator 完成后即关闭，需要另查。

冲突场景：SSE 结束后，轮询触发 RESTORE_STATUS，checkpoint 的 next 字段指向下一个暂停节点（如 plan_data_query），覆盖 SSE 刚推下的正确 pausedNode。

## Goals / Non-Goals

**Goals:**
- SSE 成为 pipeline 状态的唯一写入源
- 视频/海报状态通过独立的轻量查询获得，不依赖 LangGraph checkpoint
- 去掉 PipelineTimeline 中的重复确认按钮

**Non-Goals:**
- 不改变 SSE 事件推送的格式
- 不改变后端 LangGraph 工作流的 checkpoint 和 interrupt 逻辑
- 不改变侧边栏审核面板的功能和位置

## Decisions

### 1. 新增轻量端点代替复用 getPlanRunStatus
- **方案**: 新增 `GET /api/plans/{runId}/media-status`，只从缓存字典取 promo_video 和 poster
- **替代方案**: 在 getPlanRunStatus 中加 query 参数过滤字段
- **理由**: 新端点语义清晰，不碰 checkpoint，无 RESTORE_STATUS 风险

### 2. UPDATE_MEDIA action 代替 RESTORE_STATUS
- **方案**: reducer 新增 UPDATE_MEDIA action，只更新 outputs.poster 和 outputs.promo_video
- **理由**: RESTORE_STATUS 是全量重建 nodes/outputs，增量 action 不干扰 pipeline 状态

### 3. 只去掉 PipelineTimeline 的确认按钮，保留侧边栏
- **方案**: 去掉 PipelineTimeline.tsx 第 258 行 `isPaused || isComplete` 按钮区块
- **理由**: 侧边栏已提供确认继续 + 驳回重跑面板，流水线卡片无需重复

## Risks / Trade-offs

- [轮询频率不变] 每 5 秒查一次新端点，与之前同频，无额外压力
- [SSE 断开后的轮询] 如果 SSE 意外断开且 workflow 实际 paused，checkMediaStatus 不会恢复 pipeline paused 状态 → 需要用户在刷新页面时通过 restoreFromRunId 恢复
