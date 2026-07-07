## 1. 工作流状态机修复

- [x] 1.1 后端 `interrupt_after` → `interrupt_before`(plan_data_query 起 7 个节点),更新 `PausedSnapshot.node_id` 枚举
- [x] 1.2 `_dispatch_init` 跳过已完成并行节点,修复 resume 重跑
- [x] 1.3 新增 `_PARALLEL_PREDECESSORS` 防御,pause 前校验并行前置完成
- [x] 1.4 `on_chain_end LangGraph` 发 workflow.complete 前校验 plan_generator.chapters
- [x] 1.5 前端 `NODE_START`/`WORKFLOW_COMPLETE` 清理 pausedNode(后因双重确认 bug 回退 NODE_START 清理,改用徽章守卫)
- [x] 1.6 PipelineTimeline 徽章 `isPaused && !isRunning` 才显示「等待确认」
- [x] 1.7 PlanPage action 卡片守卫 `planGeneratorDone` 才显示
- [x] 1.8 更新后端测试断言(interrupt_before 首个暂停点 = plan_data_query)+ 新增并行竞态用例

## 2. 海报生成功能

- [x] 2.1 PlanPage 方案完成后 useEffect 自动触发海报生成(autoTriggeredRef 防重复)
- [x] 2.2 按钮文案动态:生成中 / 重新生成 / 生成海报
- [x] 2.3 尺寸选择下拉(16:9/9:16/1:1/4:3),切换尺寸自动重生成
- [x] 2.4 点击图片弹出 lightbox 放大,点空白/✕ 关闭
- [x] 2.5 PlanActionCards 扩展支持 sizeOptions / onImageClick / hasImageLayout

## 3. 视频生成

- [x] 3.1 新增 `video_generation_agent.py`(create_video_task + 流式轮询,每次循环 yield progress)
- [x] 3.2 新增 `routers/video.py` `POST /api/v1/video/generate` SSE 端点
- [x] 3.3 新增 `VideoTestPage.tsx` + App.tsx「文生视频」导航入口
- [x] 3.4 新增 `api/video.ts` + `types/video.ts`
- [x] 3.5 配置项 `DASHSCOPE_VIDEO_MODEL` / `IMAGE_GEN_MODEL` 写入 settings.py
- [x] 3.6 方案完成后异步触发宣传视频(`_run_promo_video` + `_promo_video_cache` 合并到 status outputs)
- [x] 3.7 新增 video agent 单元测试(轮询 yield / 失败 / 网络抖动 3 用例)

## 4. 配置与文档

- [x] 4.1 `.env` 整理:复用 MYSELF_API_KEY,新增 IMAGE_GEN_MODEL / DASHSCOPE_VIDEO_MODEL
- [x] 4.2 `docs/references/qwen-image-api.md` Qwen-Image API 参考文档
