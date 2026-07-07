## Context

本 change 是 image-test-page(已归档)的后续:落地图片生成后,围绕"方案 → 营销资产"补齐工作流健壮性、海报生成、视频生成三类工作。代码已全部实现并通过测试,本 design 为事后补档。

## Goals / Non-Goals

**Goals:**
- 修复工作流确认按钮相关的多个状态机 bug(确认后徽章不更新、并行节点重跑、提前显示 action 卡片)
- 海报生成:方案完成后自动出图,可重新生成、切尺寸、放大
- 视频生成:SSE 流式返回进度,防长连接空闲超时

**Non-Goals:**
- 不做图片/视频持久化存储(URL 24h 有效即可)
- 不做多轮视频编辑

## Decisions

| 决策 | 选型 | 理由 |
|------|------|------|
| interrupt 模型 | `interrupt_before`(从 plan_data_query 起) | 让每个确认按钮出现在"即将执行的节点"上,符合用户心智 |
| 并行竞态防御 | `_PARALLEL_PREDECESSORS` 显式校验 | 不依赖 LangGraph API(predecessors 不可用),手维护并行 fan-in 表 |
| resume 值 | `Command(resume={})` + `_dispatch_init` 跳过已完成 | resume={} 是 LangGraph 标准 API,通过 dispatch 跳过已完成节点避免重跑 |
| workflow.complete 守卫 | 校验 plan_generator.chapters 存在 | 防 LangGraph 边界场景提前发 complete 导致 action 卡片过早显示 |
| 视频轮询 | 每次循环 yield progress | 防 SSE 长连接空闲超时(原实现阻塞轮询 10 分钟 0 输出) |
| 海报自动生成 | useEffect + autoTriggeredRef | status 多次重渲染只触发一次 |
| 配置外部化 | image_gen_model / dashscope_video_model 写入 settings.py | 模型名在配置文件,不暴露到 .env 之外 |

## Risks / Trade-offs

- **`_PARALLEL_PREDECESSORS` 硬编码**:并行 fan-in 关系手维护,新增并行结构时需同步更新。可接受——当前图只有 plan_data_query 一个 fan-in。
- **视频 URL 24h 过期**:测试用足够,生产需加持久化。
- **内容审核拦截**:阿里云"绿网"对 prompt 审核,敏感词触发 `Green net check failed`——非代码 bug,属预期行为。

## Migration Plan

代码已实现并测试通过,无迁移步骤。后续如新增并行 fan-in 节点,需在 `_PARALLEL_PREDECESSORS` 注册。
