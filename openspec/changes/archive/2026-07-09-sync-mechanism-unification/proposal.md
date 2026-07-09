## Why

前端有两套独立的状态同步机制：SSE 事件驱动和定时轮询 refreshStatus。SSE 结束后，轮询触发 RESTORE_STATUS 读取 LangGraph checkpoint 全量状态，覆盖 SSE 刚推下的正确 pausedNode，导致"点方案生成确认继续后跳回数据查询"的 bug。

## What Changes

1. **后端新增轻量端点** `GET /api/plans/{runId}/media-status`，只返回 promo_video 和 poster 的最新状态，不读 LangGraph checkpoint
2. **前端新增 UPDATE_MEDIA action**，只更新 outputs.poster 和 outputs.promo_video，不做全量 RESTORE_STATUS
3. **refreshStatus 改名为 checkMediaStatus**，不再调用 getPlanRunStatus，只调用新的媒体状态端点
4. **轮询 interval 改用 checkMediaStatus** 代替 refreshStatus，避免 checkpoint 状态覆盖
5. **SSE 事件驱动成为 pipeline 状态的唯一来源**
6. **去掉 PipelineTimeline 中与侧边栏重复的"确认继续"按钮**

## Capabilities

### New Capabilities
- 无新增 capability，纯实现层重构

### Modified Capabilities
- `plan-generation-pipeline`: Pipeline 状态同步机制从"SSE + checkpoint 轮询"改为"SSE 事件驱动 + 媒体状态轮询"，不改变业务功能

## Impact

- `backend/app/services/plan_generation_service.py`: 新增 `get_media_status()` 函数
- `backend/app/api/plans.py`: 新增 `GET /api/plans/{runId}/media-status` 端点
- `backend/docs/api/paths/plan.yaml`: 新增端点定义
- `frontend/src/hooks/usePlanRun.ts`: 新增 UPDATE_MEDIA action，重构轮询逻辑
- `frontend/src/pages/PipelineTimeline.tsx`: 去掉重复的确认继续按钮
