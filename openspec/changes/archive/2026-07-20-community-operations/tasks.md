## 1. 经营社补充数据

- [x] 1.1 新增 `backend/mock_data/community_operations/community_data.json`（经营社模板数据：community_types / content_formats / engagement_methods / kpi_reference）

## 2. 后端闭环

- [x] 2.1 新增 schema `backend/app/schemas/community_operations.py`（ContentPlanItem / OperationActivity / CommunityOperationsResult）
- [x] 2.2 意图识别：IntentRecognitionOutput pattern 增加 `community_operations` + 新增 normalize 逻辑
- [x] 2.3 Prompt 模板 `intent_recognition.md.j2` 增加 community_operations 规则
- [x] 2.4 新增服务 `backend/app/services/community_operations_service.py`：analyze_stream() + save/get
- [x] 2.5 新增 API YAML `docs/api/paths/community-operations.yaml`
- [x] 2.6 新增路由 `backend/app/routers/community_operations.py`：POST /community-operations/stream + GET /community-operations/results/{id}
- [x] 2.7 新增 mock 结果目录 `mock_data/community_operations/results/`（.gitkeep）

## 3. 前端闭环

- [x] 3.1 ChatMessage 类型扩展（intent / canStartCommunityOperations / communityOperationsResult / communityOperationsId）
- [x] 3.2 useChat.ts 新增 action type + reducer
- [x] 3.3 新增 hook `useCommunityOperationsStream.ts`
- [x] 3.4 新增入口卡 `CommunityOperationsEntryCard.tsx`
- [x] 3.5 新增详情页 `ScreenCommunityOperations.tsx`
- [x] 3.6 ScreenChat.tsx 接入（hook + 自动触发 + handleOpen + ChatBubble prop）
- [x] 3.7 MobileWorkbenchPage.tsx 新增 overlay 态 + 动画状态
- [x] 3.8 mobile-workbench.css 新增 community 样式

## 4. 药丸

- [x] 4.1 REFRESHABLE_POOL 增加社群运营药丸（send-text "帮我规划社群运营"）
- [x] 4.2 intent_recognition.md.j2 规则序号检查

## 5. 测试

- [x] 5.1 后端：schema / service / intent normalize
- [x] 5.2 前端：入口卡 / 详情页 / 404 / 500
