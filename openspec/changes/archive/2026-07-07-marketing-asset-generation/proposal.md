## Why

在图片生成 Agent(image-test-page)落地后,需要补齐三类工作:
1. **工作流状态机修复** — `interrupt_after` 语义导致确认按钮错位、并行节点被重跑、徽章状态不更新等多个 bug,影响方案生成的可用性。
2. **海报生成功能** — 方案完成后自动生成主视觉海报,支持重新生成、尺寸切换、点击放大。
3. **视频生成** — 接入阿里云百炼文生视频模型(HappyHorse),提供独立的视频测试页 + 方案完成后的宣传视频卡片。

三者都围绕"方案生成后的营销资产生成 + 工作流健壮性",合并为一个 change 归档。

## What Changes

### 工作流状态机修复
- 后端 `interrupt_after` → `interrupt_before`,从 `plan_data_query` 起每个节点执行前暂停
- `_dispatch_init` 跳过已完成并行节点,修复 `Command(resume={})` 重跑问题(避免双重确认)
- `_PARALLEL_PREDECESSORS` 防御:并行 fan-in 节点 pause 前校验所有前置完成
- `on_chain_end LangGraph` 发 workflow.complete 前校验 plan_generator 输出
- 前端 `NODE_START` / `WORKFLOW_COMPLETE` 清理 pausedNode
- PipelineTimeline 徽章:`isPaused && !isRunning` 才显示"等待确认"
- 前端 action 卡片守卫:`status==='completed' && planGeneratorDone` 才显示

### 海报生成功能
- PlanPage 方案完成后 `useEffect` 自动触发海报生成
- 按钮文案:生成中 / 重新生成 / 生成海报
- 尺寸选择下拉(16:9 / 9:16 / 1:1 / 4:3),切换尺寸自动重生成
- 点击图片弹出 lightbox 放大

### 视频生成
- `video_generation_agent.py` — 创建任务 + 流式轮询,轮询期间持续 yield progress(防 SSE 空闲超时)
- `routers/video.py` — `POST /api/v1/video/generate` SSE 端点
- `VideoTestPage.tsx` + App.tsx 导航「文生视频」入口
- 配置项 `DASHSCOPE_VIDEO_MODEL`(默认 happyhorse-1.1-t2v)、`IMAGE_GEN_MODEL`(默认 qwen-image-2.0-pro)
- 方案完成后异步触发宣传视频,`_promo_video_cache` 合并到 status outputs

## Capabilities

### New Capabilities

- `video-generation`: 文生视频生成能力(SSE 流式 + 任务轮询)

### Modified Capabilities

- `plan-generation-pipeline`: 工作流 interrupt 模型从 after 改 before,并行竞态防御,确认按钮状态修正
- `image-generation`(image-test-page 已归档的扩展): 海报自动生成 / 重新生成 / 放大 / 尺寸选择

## Impact

**后端**:
- `app/services/plan_generation_service.py` — interrupt 配置、`_dispatch_init`、`_PARALLEL_PREDECESSORS`、workflow.complete 守卫、promo_video
- `app/agents/video_generation_agent.py`(新增)
- `app/routers/video.py`(新增)
- `app/config/settings.py` — `image_gen_model`、`dashscope_video_model`
- `app/main.py` — 注册 video 路由
- `app/schemas/plan_run.py` — PausedSnapshot.node_id 枚举扩展

**前端**:
- `src/hooks/usePlanRun.ts` — NODE_START/WORKFLOW_COMPLETE 清理 pausedNode
- `src/pages/PipelineTimeline.tsx` — 徽章 `isPaused && !isRunning`
- `src/pages/PlanPage.tsx` — 海报自动生成 / 尺寸 / lightbox / action 卡片守卫
- `src/pages/PlanActionCards.tsx` — 卡片支持尺寸选择 + 图片点击放大
- `src/pages/VideoTestPage.tsx`(新增)
- `src/api/video.ts`(新增)、`src/types/video.ts`(新增)
- `src/App.tsx` — 文生视频导航

**测试**:
- `backend/tests/test_agents/test_video_generation_agent.py`(新增,3 用例)
- `backend/tests/test_services/test_plan_generation_service.py` — 更新为 interrupt_before 断言 + 并行竞态用例(2 新增)
- `frontend/__tests__/` — 全量通过(51 用例)
