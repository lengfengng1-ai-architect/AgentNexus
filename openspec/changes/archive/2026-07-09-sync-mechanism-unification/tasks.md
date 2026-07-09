## 1. 后端：新增 media-status 轻量端点

- [x] 1.1 在 `plan_generation_service.py` 中新增 `get_media_status(run_id)` 函数，从 `_promo_video_cache` 和 `_poster_cache` 取状态
- [x] 1.2 在 `docs/api/paths/plan.yaml` 中定义 `GET /api/plans/{runId}/media-status` 端点
- [x] 1.3 在 `app/routers/plan.py` 中新增 `plan_run_media_status` 路由，调用 `get_media_status`

## 2. 前端：新增 UPDATE_MEDIA action + checkMediaStatus

- [x] 2.1 在 `usePlanRun.ts` reducer 中新增 `UPDATE_MEDIA` action 类型和处理分支，只更新 outputs.poster 和 outputs.promo_video
- [x] 2.2 新增 `checkMediaStatus` 函数，调用新的 media-status API 端点，dispatch UPDATE_MEDIA
- [x] 2.3 新增前端 API 调用函数 `getPlanMediaStatus`（在 `src/api/plan.ts` 中）
- [x] 2.4 替换 PlanPage 中视频/海报的轮询从 `refreshStatus` 改为 `checkMediaStatus`

## 3. 修复 SSE resume 时并行节点误发 node.start

- [x] 3.1 在 `_stream_events` 中去重逻辑中，对并行节点（product_research/market_research/audience_insight）用 state_values 判断执行状态，预填进 started 去重集合
