## 1. 后端闭环

- [x] 1.1 新增 schema `backend/app/schemas/competitor_analysis.py`（CompetitorItem / CompetitorAnalysisResult）
- [x] 1.2 意图识别：IntentRecognitionOutput pattern 增加 `competitor_analysis` + 新增 normalize 逻辑
- [x] 1.3 Prompt 模板 `intent_recognition.md.j2` 增加 competitor_analysis 规则
- [x] 1.4 新增服务 `backend/app/services/competitor_analysis_service.py`：analyze_stream()（搜索+SSE）+ save/get 持久化
- [x] 1.5 新增 API YAML `docs/api/paths/competitor-analysis.yaml`
- [x] 1.6 新增路由 `backend/app/routers/competitor_analysis.py`：POST /competitor-analysis/stream + GET /competitor-analysis/results/{id}
- [x] 1.7 新增 mock 结果目录 `mock_data/competitor_analysis/results/`（.gitkeep）

## 2. 前端闭环

- [x] 2.1 ChatMessage 类型扩展（intent / canStartCompetitorAnalysis / competitorAnalysisResult / competitorAnalysisId）
- [x] 2.2 useChat.ts 新增 action type + reducer
- [x] 2.3 新增 hook `useCompetitorAnalysisStream.ts`
- [x] 2.4 新增入口卡 `CompetitorAnalysisEntryCard.tsx`
- [x] 2.5 新增详情页 `ScreenCompetitorAnalysis.tsx`
- [x] 2.6 ScreenChat.tsx 接入（hook + 自动触发 + handleOpen + ChatBubble prop）
- [x] 2.7 MobileWorkbenchPage.tsx 新增 overlay 态 + 动画状态
- [x] 2.8 mobile-workbench.css 新增 competitor 样式

## 3. 药丸 + 换一批

- [x] 3.1 REFRESHABLE_POOL 增加竞品分析药丸（send-text "帮我做竞品分析"）
- [x] 3.2 intent_recognition.md.j2 规则序号检查

## 4. 测试

- [x] 4.1 后端：schema / service analyze_stream / save_get / intent normalize 测试
- [x] 4.2 前端：入口卡 / 详情页 / 404 / 500 测试
