## Why

行动建议卡片目前只有文本描述，缺乏视觉冲击力。流水线中已有 HappyHorse 文生视频能力，可以在 action_recommendations 节点完成后，根据策略输出异步生成一条宣传视频，展示在"下一步行动建议"列表的第一个位置，提升用户感知。

## What Changes

- `action_recommendations` 节点完成后，后端异步触发 HappyHorse 视频生成（不阻塞后续 pipeline）
- 视频规格：16:9、720P、5s
- 视频结果合并到 `outputs` 的 promo_video 字段
- 前端 PlanActionCards 首条渲染 `<video>` 播放器（含"生成中…"→播放的过渡状态）
- 前端在方案完成后定时轮询 getStatus，直到视频可用

## Capabilities

### New Capabilities
- `promo-video`: 营销方案宣传视频生成，基于策略输出自动拼接 prompt，调用 HappyHorse API 异步生成

### Modified Capabilities
- `plan-generation-pipeline`: action_recommendations 节点后触发异步视频生成，outputs 增加 promo_video 字段
- `plan-generation-workbench`: 前端 PlanActionCards 首条渲染为视频播放卡片

## Impact

- **后端**: `services/plan_generation_service.py` — action_recommendations handler 后触发异步任务，`get_status` 合并视频结果；`schemas/plan_generation.py` — ActionRecommendation 扩展 type 字段
- **前端**: `types/plan.ts` — PlanActionItem 扩展 type/videoUrl；`PlanActionCards.tsx` — 视频卡片渲染；`PlanPage.tsx` — 视频生成中时轮询
- **依赖**: 无新增（httpx 已存在、视频 API 已封装）
