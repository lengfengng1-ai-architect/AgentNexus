## 1. 后端 — schema + OpenAPI + service + router + intent

- [x] 1.1 `schemas/alliance_planning.py`：AlliancePlanningRequest（category/city）、RecruitmentItem、InfluencerTiers、AlliancePlanningResult（category/city/leagues/recruitments/influencers/suggestion）
- [x] 1.2 `services/alliance_planning_service.py`：analyze_stream + save/get（al-\<uuid8\>）+ 数据查询（leagues/cooperation/influencers）+ LLM 建议
- [x] 1.3 `prompt_templates/alliance_suggestion.md.j2`
- [x] 1.4 `routers/alliance_planning.py`：POST stream + GET results/{id}
- [x] 1.5 `docs/api/paths/alliance-planning.yaml`
- [x] 1.6 main.py 注册 + `.gitignore`
- [x] 1.7 intent：枚举 + alliance_planning + normalize（category+city 守卫）+ prompt 规则 + INDEPENDENT

## 2. 前端 — API + types + hook + useChat

- [x] 2.1 `api/alliancePlanning.ts`
- [x] 2.2 `types/chat.ts`：alliancePlanningId + canStartAlliancePlanning + alliancePlanningResult
- [x] 2.3 `hooks/useAlliancePlanningStream.ts`
- [x] 2.4 useChat：SET_ALLIANCE_PLANNING_RESULT + canStartAlliancePlanning

## 3. 前端 — 入口卡 + 详情页 + 接入

- [x] 3.1 `components/AlliancePlanningEntryCard.tsx` + css
- [x] 3.2 `pages/mobile-workbench/ScreenAlliancePlanning.tsx`
- [x] 3.3 mobile-workbench.css：.mal-* 覆盖屏
- [x] 3.4 ChatBubble + ScreenChat + MobileWorkbenchPage + 药丸 payload

## 4. 测试 + 浏览器验证

- [x] 4.1 后端：test_alliance_planning_service
- [x] 4.2 前端：AlliancePlanningEntryCard + ScreenAlliancePlanning
- [x] 4.3 tsc + vitest
- [x] 4.4 浏览器端到端
