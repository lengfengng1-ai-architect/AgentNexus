## 1. 后端：缓存与异步触发

- [x] 1.1 在 `plan_generation_service.py` 添加 `_promo_video_cache: dict[str, dict]` 模块级缓存
- [x] 1.2 在 `_build_node("action_recommendations")` handler 返回后，读取 state 拼接 prompt，异步调用 `video_generation_agent.create_video_task` + `poll_video_task`，结果写入缓存
- [x] 1.3 修改 `get_status()` 合并 `_promo_video_cache[run_id]` 到 outputs.promo_video

## 2. 后端：Prompt 拼接

- [x] 2.1 实现 prompt 拼接函数，从 brand_input（brand_name、category）和 strategy_generation（positioning、marketing_goal）生成 prompt

## 3. 后端：轮询清理

- [x] 3.1 `delete_run` 时清理 `_promo_video_cache` 中的对应 key

## 4. 前端：类型扩展

- [x] 4.1 `types/plan.ts` 中 `PlanOutputs` 增加 `promo_video?: { status: string; video_url?: string; error?: string }`
- [x] 4.2 `types/plan.ts` 中 `PlanActionItem` 增加 `type?: 'normal' | 'video'`、`videoUrl?: string`

## 5. 前端：PlanActionCards 视频卡片

- [x] 5.1 渲染逻辑：第一条 action 如果 `type === 'video'`，渲染视频卡片（生成中 → 脉冲动画，完成 → `<video controls autoPlay>`，失败 → 错误提示）
- [x] 5.2 视频卡片使用深色背景适配视频播放

## 6. 前端：轮询逻辑

- [x] 6.1 `PlanPage.tsx` 中监听 `status === 'completed'` 且 `outputs.promo_video?.status === 'generating'` 时，启动定时器（5s 间隔）调用 `getPlanRunStatus`
- [x] 6.2 视频状态变为 completed 或 failed 时停止轮询
- [x] 6.3 组件卸载时清除定时器
