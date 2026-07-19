## 1. 后端 — schema + OpenAPI

- [x] 1.1 `app/schemas/activity_planning.py`：ActivityPlanningRequest（sport_type/city）、CandidateTournament（name/sport_type/scale/frequency/sponsorship_options）、ActivityPlanningResult（sport_type/city/candidates/events_summary/venues/suggestion）
- [x] 1.2 `docs/api/paths/activity-planning.yaml`（镜像 budget-analysis.yaml）：POST /activity-planning/stream、GET /activity-planning/results/{id}

## 2. 后端 — service + 持久化

- [x] 2.1 `app/services/activity_planning_service.py`：analyze_stream（SSE）、save/get_activity_result（ap-\<uuid8\>，正则 `^ap-[0-9a-f]{8}$`）
- [x] 2.2 赛事过滤：data_provider.get_city_data → tournament 按 sport_type + available_cities 匹配；无匹配降级城市 top 3 + 注明
- [x] 2.3 汇总 events（monthly/avg_participants/categories）+ venues（count/types/capacity）
- [x] 2.4 LLM 一句话建议（`activity_suggestion.md.j2`，基于候选赛事，不编造）
- [x] 2.5 result 事件携带 activity_planning_id（先写盘后发）

## 3. 后端 — router + 注册

- [x] 3.1 `app/routers/activity_planning.py`：POST stream（SSE）、GET results/{id}（sync def、404/500）
- [x] 3.2 main.py 注册 router
- [x] 3.3 `.gitignore` 增加 `backend/mock_data/activity_planning/results/`

## 4. 后端 — 意图识别

- [x] 4.1 `schemas/intent.py`：intent 枚举 + activity_planning；IntentRecognitionOutput 加 `sport_type: str | None`
- [x] 4.2 intent_recognition.md.j2：新增 activity_planning 规则 + sport_type 提取说明
- [x] 4.3 intent_recognition_agent.py normalize：activity_planning 字段守卫（sport_type+city 缺则保持意图+反问，镜像 budget_assessment）；sport_type 从 context 持续
- [x] 4.4 INDEPENDENT 集合加 activity_planning

## 5. 前端 — API + types + hook

- [x] 5.1 `api/activityPlanning.ts`：fetchActivityResult（404→NotFoundError）+ 类型
- [x] 5.2 `types/chat.ts`：ChatMessage 加 activityPlanningId? + canStartActivityPlanning? + activityPlanningResult?
- [x] 5.3 `hooks/useActivityPlanningStream.ts`（镜像 useBudgetAssessmentStream）
- [x] 5.4 useChat：SET_ACTIVITY_PLANNING_RESULT action + INTENT_RECEIVED 算 canStartActivityPlanning（intent=activity_planning && sport_type+city 齐）

## 6. 前端 — 入口卡 + 详情页

- [x] 6.1 `components/ActivityPlanningEntryCard.tsx`：候选赛事数 + top 赛事（name/scale）+ 建议 + 按钮
- [x] 6.2 `components/activity-planning-entry.css`（毛玻璃，仿 bae-）
- [x] 6.3 `pages/mobile-workbench/ScreenActivityPlanning.tsx`（镜像 ScreenBudgetAssessment）：候选赛事卡列表（scale/frequency/sponsorship chips）+ 活动热度 + 场馆 + 建议
- [x] 6.4 mobile-workbench.css：.mau-* 覆盖屏样式（slide-in/out + 毛玻璃，复用模式）

## 7. 前端 — 接入

- [x] 7.1 ChatBubble：activityPlanningId 存在时渲染 ActivityPlanningEntryCard
- [x] 7.2 ScreenChat：handleOpenActivityPlanning + 自动触发 effect（sport_type+city 齐）+ ChatBubble 传 onOpen
- [x] 7.3 MobileWorkbenchPage：activity 覆盖屏状态 + handleActivityBack + handleChatNavigate 分支 + 渲染 + hideTopbar/HIDE_TABS/DEFAULT_TOPBAR/handleBack
- [x] 7.4 创建活动药丸：payload 改"帮我规划一个活动"（已是 send-text，只改文案）

## 8. 测试

- [x] 8.1 后端：test_activity_planning_service（save/get、无效 ID、损坏文件、GET 200/404、赛事过滤+降级、analyze_stream 携带 id）
- [x] 8.2 前端：ActivityPlanningEntryCard（渲染/按钮）+ ScreenActivityPlanning（skeleton→详情、404、error）
- [x] 8.3 tsc + vitest 无回归

## 9. 浏览器验证

- [x] 9.1 点创建活动药丸 → 种子消息 → 多轮反问（sport_type/city）→ 补齐 → 规划计算
- [x] 9.2 入口卡（候选赛事+建议+按钮）→ 点按钮 → 详情覆盖屏（赛事卡+热度+场馆）
- [x] 9.3 无匹配赛事时降级显示城市 top 3
