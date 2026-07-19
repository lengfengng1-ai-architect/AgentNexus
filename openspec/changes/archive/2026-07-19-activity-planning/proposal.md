## Why

"创建活动"药丸当前只 send-text 触发全量方案，缺聚焦输出。用户希望套用预算评估模式：药丸发种子消息 → 多轮收 sport_type/city → 查 mock 赛事/场馆数据 → 给出聚焦的活动规划建议（候选赛事 + 赞助权益 + 场馆）+ 入口卡 + 毛玻璃详情页。这是药丸多轮化的第二个 capability（budget-analysis 之后）。

## What Changes

- 新增 capability `activity-planning`（已在 superpowers.yaml in_scope）
- 意图识别新增 `activity_planning` 意图（关键词"创建活动/策划活动"），新增 `sport_type` 字段（LLM 提取，加到 IntentRecognitionOutput）；多轮收 sport_type + city（复用 clarify）
- 字段齐后触发活动规划计算：查 allygo_city_data 的 tournament（按 sport_type + available_cities 过滤，无匹配降级）+ events + venues → 候选赛事 + 城市热度 + 场馆 + LLM 一句话建议
- 结果持久化（JSON-by-ID `ap-<uuid8>`）+ GET 端点
- 聊天入口卡 `ActivityPlanningEntryCard`（候选赛事数 + top 赛事摘要 + 建议 + 按钮）
- 详情覆盖屏 `ScreenActivityPlanning`（候选赛事卡列表含赞助权益 + 活动热度 + 场馆，毛玻璃）
- 创建活动药丸从 send-text 全量改为 send-text 种子消息"帮我规划一个活动"

## Capabilities

### New Capabilities

- `activity-planning`: 基于运动类型/城市，结合 mock 赛事/场馆/活动热度数据，给出活动规划建议（候选赛事 + 赞助权益 + 场馆），多轮澄清 + 入口卡 + 详情页。仅规划不执行。

### Modified Capabilities

- `intent-recognition`: 新增 activity_planning 意图 + sport_type 字段
- `mobile-chat-session`: 创建活动药丸改种子消息；ChatBubble 新增 activity 入口卡分支

## Impact

**后端**（新）：
- `app/schemas/activity_planning.py`、`app/services/activity_planning_service.py`（SSE+持久化+过滤+LLM建议）、`app/routers/activity_planning.py`、`app/prompt_templates/activity_suggestion.md.j2`、`docs/api/paths/activity-planning.yaml`
- intent_recognition：新增 activity_planning 意图 + sport_type 字段（schema + prompt + normalize）
- mock 数据读取：复用 data_provider.get_city_data（已有）

**前端**（新）：
- `ActivityPlanningEntryCard.tsx` + css、`ScreenActivityPlanning.tsx`、`useActivityPlanningStream.ts`、`api/activityPlanning.ts`
- ChatBubble / ScreenChat / MobileWorkbenchPage / useChat / chat types 接入
- 创建活动药丸改种子消息

**Non-goals**：
- 不自动创建活动/下单（out_scope）
- 不做 alliance-planning（下一个 change）
- 不改其他药丸/PC 端
- 不引入新依赖
