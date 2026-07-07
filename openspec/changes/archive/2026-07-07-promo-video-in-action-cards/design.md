## Context

营销方案流水线当前包含 10 个串行 agent，其中 `action_recommendations` 输出结构化的行动建议列表（ActionRecommendationsOutput.actions），前端渲染为 PlanActionCards。已接入阿里云百炼 HappyHorse 文生视频 API（异步创建任务 + 轮询获取结果）。

现在需要在 `action_recommendations` 完成后，在不阻塞流水线的前提下，异步生成一条 16:9、720P、5s 的营销宣传视频，最终展示在行动建议卡片列表的第一位。

## Goals / Non-Goals

**Goals:**
- `action_recommendations` 节点完成后，后台触发视频生成（不阻塞 `plan_generator`）
- 视频 prompt 基于品牌名、策略输出（定位/目标/核心信息）自动拼接
- 视频结果通过 `get_status()` 返回给前端
- 前端行动建议卡片第一条展示视频播放器（生成中→播放的过渡）

**Non-Goals:**
- 不修改 pipeline 图拓扑（不新增 graph node，不增加 interrupt）
- 不做视频结果的持久化存储（仅内存缓存，有效期同 run_id 生命周期）
- 不修改视频 agent 本身（复用已有的 `video_generation_agent.py`）

## Decisions

### 1. 异步触发方式：`asyncio.create_task` 而非独立 graph node

| 方案 | 分析 |
|------|------|
| ✅ 在 `_build_node("action_recommendations")` handler 返回后，用 `asyncio.create_task` 启动后台任务 | 不阻塞 pipeline；不修改 graph 拓扑；pipeline 走完时视频可能还在轮询 |
| ❌ 新增一个 `promo_video` graph node | 需要改 graph 拓扑、增加 `promo_video` 到 PlanState、增加 NODE_LABELS；增加 1-5 分钟阻塞 |
| ❌ 独立 endpoint 让前端触发 | 前端需要知道流水线完成时间；增加前后端协调复杂度 |

**选择理由**: create_task 最小化改动的风险，视频生成本身不依赖 plan_generator 的输出（只依赖 action_recommendations 之前的策略数据）。

### 2. 视频结果传递：模块级 Dict 缓存 + getStatus 合并

- `_promo_video_cache: dict[str, PromoVideoOutput]` 存于 `plan_generation_service.py` 模块级
- action_recommendations 完成后：初始化缓存状态为 `{status: "generating"}`
- 后台 task 完成后：更新缓存为 `{status: "completed", video_url: "..."}` 或 `{status: "failed", error: "..."}`
- `get_status()` 返回时，从缓存中合并 promo_video 到 outputs

### 3. 前端轮询策略

- `PlanPage` 中监听 `status === 'completed'` 且 `outputs.promo_video?.status === 'generating'` 时，启动定时器（5s 间隔）调 `getStatus`
- 首次拿到 `status === 'completed'` 时停止轮询

### 4. Prompt 拼接策略

```python
prompt = f"{brand_name}品牌{brand_category}营销活动宣传片。{positioning}。{marketing_goal}。动态感，活力十足，画面节奏明快。"
```

- 来源：`brand_input.brand_name`、`brand_input.category`、`strategy_generation.positioning`、`strategy_generation.marketing_goal`
- 加入风格描述确保视频一致性

## Data Flow

```
action_recommendations handler 返回后:
  1. 从 state 读取 brand_input / strategy_generation
  2. 拼接 prompt
  3. _promo_video_cache[run_id] = {status: "generating"}
  4. asyncio.create_task(_run_promo_video(run_id, prompt))
     ├─ create_video_task(prompt, ratio="16:9", resolution="720P", duration=5)
     ├─ poll_video_task(task_id)
     └─ _promo_video_cache[run_id] = {status: "completed", video_url: "..."}

前端调用 get_status():
  outputs: {
    ...,
    action_recommendations: { actions: [...] },
    promo_video: { status: "completed", video_url: "https://..." }  ← 合并
  }

PlanActionCards 渲染:
  actions[0] 的 type 替换为 "video" → 渲染 <video controls autoPlay>
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| 视频生成耗时 1-5 分钟，用户可能关闭页面 | 前端轮询在页面可见时持续，关闭后丢失结果（MVP 可接受） |
| 视频生成失败（API 限频、参数错误） | 缓存中记录 failed 状态，前端显示"视频生成失败" + 降级显示文本建议 |
| asyncio.create_task 在进程重启后丢失 | MVP 不做持久化；Promo video 是增强功能，不影响方案核心价值 |
| 多个 run 同时进行时的 key 冲突 | 用 run_id 作为缓存 key，每个 task 独立 |
