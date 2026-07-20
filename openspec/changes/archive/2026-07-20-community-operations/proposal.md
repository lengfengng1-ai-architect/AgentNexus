## Why

用户希望药丸增加"社群运营"入口。目前平台已有经营号活跃榜、社团、门店、达人等数据，但缺少针对品牌品类的社群运营规划建议。通过组合现有 mock 数据 + 轻量经营社补充数据，可以让品牌方快速获得社群定位、内容规划和运营活动建议。

社群运营功能已在 `superpowers.yaml` 新增 in_scope。

## What Changes

- 新增后端 `community_operations_service.py`，实现 mock 数据驱动的社群运营规划 SSE 流
- 新增经营社补充 mock 数据 `mock_data/community_operations/community_data.json`
- 新增意图 `community_operations`，多轮收集 category（品类）+ city（城市），字段齐后触发
- 新增 SSE 端点 `POST /community-operations/stream` + `GET /community-operations/results/{id}`
- 新增前端入口卡 `CommunityOperationsEntryCard` + 详情页 `ScreenCommunityOperations`
- 新增 mock 数据目录 `mock_data/community_operations/results/`
- 更新 `REFRESHABLE_POOL` 增加社群运营药丸

## Capabilities

### New Capabilities
- `community-operations`: 基于品类/城市，结合 mock 经营社数据（社团/门店/达人/榜单）和补充经营社实体数据，给出社群运营建议（社群定位 + 内容规划 + 运营活动 + KPI 目标）。多轮澄清收集需求，结果在聊天入口卡 + 独立详情页展示。

### Modified Capabilities
- `workflow-orchestration`: intent_recognition.md.j2 prompt 增加 community_operations 意图判断规则

## Impact

- `backend/mock_data/community_operations/community_data.json` — 新增经营社补充 mock 数据
- `backend/app/services/community_operations_service.py` — 新增服务层（SSE + 数据查询 + 结果持久化）
- `backend/app/routers/community_operations.py` — 新增路由（stream + get result）
- `backend/app/schemas/` — 新增 `community_operations.py`（结果 schema）
- `backend/app/agents/intent_recognition_agent.py` — 增加 community_operations normalize 逻辑
- `backend/app/prompt_templates/intent_recognition.md.j2` — 增加 community_operations 规则
- `backend/app/schemas/intent.py` — IntentRecognitionOutput pattern 增加 community_operations
- `frontend/src/components/CommunityOperationsEntryCard.tsx` — 新增入口卡
- `frontend/src/pages/mobile-workbench/ScreenCommunityOperations.tsx` — 新增详情页
- `frontend/src/hooks/` — 新增 `useCommunityOperationsStream.ts`
- `frontend/src/pages/mobile-workbench/ScreenChat.tsx` — 新增导入/触发/路由
- `frontend/src/types/chat.ts` — ChatMessage 扩展字段
- `frontend/src/hooks/useChat.ts` — 新增 action type + reducer
- `frontend/src/pages/mobile-workbench/MobileWorkbenchPage.tsx` — 新增 overlay 态

## Non-goals

- 不自动建群/发消息/执行运营动作（仅输出规划建议）
- 不接入外部社群平台数据（微信/抖音社群等）
- 不包含效果归因系统
