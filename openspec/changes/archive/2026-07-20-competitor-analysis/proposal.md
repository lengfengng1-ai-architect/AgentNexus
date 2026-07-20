## Why

用户希望药丸增加"竞品分析"入口。目前市场分析聚焦行业趋势和消费者洞察，缺少针对具体品牌/品类的竞品逐项对比能力。通过 Web 搜索实时获取竞品信息，可以让品牌方快速了解竞争格局。

竞品分析功能已从 `superpowers.yaml` out_scope 移至 in_scope。

## What Changes

- 新增后端 `competitor_analysis_service.py`，实现 Web 搜索驱动的竞品分析 SSE 流
- 新增意图 `competitor_analysis`，多轮收集 category（品类，必填）+ brand_name（品牌名，可选），字段齐后触发搜索流
- 新增 SSE 端点 `POST /competitor-analysis/stream` + `GET /competitor-analysis/results/{id}`
- 新增前端入口卡 `CompetitorAnalysisEntryCard` + 详情页 `ScreenCompetitorAnalysis`
- 新增 mock 数据目录 `mock_data/competitor_analysis/results/`
- 更新 `REFRESHABLE_POOL` 增加竞品分析药丸

## Capabilities

### New Capabilities
- `competitor-analysis`: 基于品类/品牌名称，通过 Web 搜索获取竞品名单、产品矩阵、定价策略、营销渠道、近半年动态等信息，结构化输出竞品对比报告。支持品类级（无具体品牌）和品牌级（有具体品牌）两种模式。

### Modified Capabilities
- `workflow-orchestration`: intent_recognition.md.j2 prompt 增加 competitor_analysis 意图判断规则（规则序号需确认）

## Impact

- `backend/app/services/competitor_analysis_service.py` — 新增服务层（SSE + 搜索 + 结果持久化）
- `backend/app/routers/competitor_analysis.py` — 新增路由（stream + get result）
- `backend/app/schemas/` — 新增 `competitor_analysis.py`（结果 schema）
- `backend/app/agents/intent_recognition_agent.py` — 增加 competitor_analysis normalize 逻辑
- `backend/app/prompt_templates/intent_recognition.md.j2` — 增加 competitor_analysis 规则
- `backend/app/schemas/intent.py` — IntentRecognitionOutput pattern 增加 competitor_analysis
- `frontend/src/components/CompetitorAnalysisEntryCard.tsx` — 新增入口卡
- `frontend/src/pages/mobile-workbench/ScreenCompetitorAnalysis.tsx` — 新增详情页
- `frontend/src/hooks/` — 新增 `useCompetitorAnalysisStream.ts`
- `frontend/src/pages/mobile-workbench/ScreenChat.tsx` — 新增导入/触发/路由
- `frontend/src/types/chat.ts` — ChatMessage 扩展字段
- `frontend/src/hooks/useChat.ts` — 新增 action type + reducer
- `frontend/src/pages/mobile-workbench/MobileWorkbenchPage.tsx` — 新增 overlay 态

## Non-goals

- 不自动存入竞品品牌数据
- 不涉及跨平台数据接入（使用 Web 搜索公开信息）
- 不包含效果归因或自动执行
