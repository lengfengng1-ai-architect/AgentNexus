# Tasks: add-plan-generation-workbench

## Phase 1: OpenSpec 与接口契约

- [x] 在 `docs/api/paths/workflows.yaml` 中新增 SSE 运行接口和控制/状态接口定义
- [x] 在 `docs/api/paths/plan.yaml` 中新增 `/plan` 页面所需后端接口契约（如有）
- [x] 定义 `plan_generation_pipeline` 的 Agent 输出 Pydantic schemas（`backend/app/schemas/plan_generation.py`）

## Phase 2: 后端 Agent 实现

- [x] 实现 `requirement_collector` Agent：校验 `brand_input` 完整性
- [x] 复用/增强 `market_research` Agent，输出结构化市场分析
- [x] 实现 `audience_insight` Agent：基于 mock 数据输出城市运动人群画像分析
- [x] 复用/增强 `data_query` Agent：输出城市级盟域/赛事/达人/场馆/经营社结构化数据
- [x] 实现 `fitness_analysis` Agent：基于规则矩阵输出品牌品类 × 运动场景适配度评分
- [x] 实现 `strategy_generation` Agent：输出核心定位、4M+1C 策略框架
- [x] 实现 `execution_planning` Agent：输出赛事/盟域/达人/内容/数字化运营落地方案
- [x] 实现 `budget_kpi` Agent：输出预算分配、KPI 预测、时间表
- [x] 实现 `action_recommendations` Agent：输出下一步行动建议
- [x] 实现 `plan_generator` Agent：汇总上游输出为 9 章 Markdown 方案
- [x] 为每个新 Agent 编写 prompt 模板（`backend/app/prompt_templates/`）
- [x] 为每个新 Agent 添加 mock 模式实现，支持 `USE_MOCK_DATA=true`

## Phase 3: 后端工作流与编排

- [x] 创建 `backend/workflows/plan_generation_pipeline.yaml`
- [x] 扩展 orchestrator，支持节点失败后阻塞并保留 state
- [x] 扩展 `workflow_service.py`，支持生成运行实例 `run_id` 并缓存运行状态
- [x] 扩展 workflows router，支持 `POST /run?stream=true` 返回 SSE
- [x] 实现 `POST /workflows/runs/{run_id}/control`（retry/skip/abort）
- [x] 实现 `GET /workflows/runs/{run_id}/status`
- [x] 实现 SSE 断线重连（基于 `last_event_id`）
- [x] 为新增/扩展的 Agent 和 service 方法编写测试

## Phase 4: 前端基础能力

- [x] 新增 `frontend/src/hooks/useWorkflowSSE.ts`：SSE 连接、事件解析、断线重连
- [x] 新增 `frontend/src/types/plan.ts`：方案相关类型定义
- [x] 新增 `frontend/src/api/plan.ts`：调用 SSE 运行接口和控制/状态接口
- [x] 扩展 `frontend/src/hooks/useChat.ts`：当 `generate_plan` 且字段完整时，在 AI 回复中携带"生成方案"动作

## Phase 5: /plan 工作台页面

- [x] 新增 `frontend/src/pages/PlanPage.tsx`
- [x] 实现左侧会话摘要 + 可编辑表单组件
- [x] 实现 Agent 流水线可视化组件（垂直时间线、节点状态、脉冲动画）
- [x] 实现实时日志流组件
- [x] 实现方案预览组件（9 章折叠面板、渐进式渲染）
- [x] 实现行动建议卡片区域
- [x] 实现"自动继续"开关、失败后"重试/跳过/终止"按钮、完成后"查看/调整/重新生成"按钮
- [x] 实现移动端适配

## Phase 6: /chat 跳转集成

- [x] 扩展 `frontend/src/pages/ChatPreviewPage.tsx`：AI 回复卡片显示"生成方案"按钮
- [x] 实现会话上下文 + `brand_input` 写入 localStorage
- [x] 实现从 `/chat` 导航到 `/plan?session=<id>`

## Phase 7: 路由与入口

- [x] 在 `frontend/src/App.tsx` 或路由配置中新增 `/plan` 路由
- [x] 确保 `/plan` 直接访问时可编辑表单并启动流水线

## Phase 8: 测试与验证

- [x] 后端测试覆盖新 Agent、SSE 接口、控制接口、状态接口（覆盖率 84%，≥80%）
- [x] 前端测试覆盖 `/plan` 页面基础渲染、SSE hook、流水线组件（22 tests, 7 files）
- [x] 本地启动前后端，验证 `/chat` → `/plan` 完整流程
- [ ] 验证 Agent 节点失败后的重试/跳过/终止流程（需要 mock 异常场景手动验证）
- [ ] 验证 SSE 断线重连（需要手动触发后端重启验证）
- [x] 后端全量 146 测试通过，覆盖率 ≥84%

## Phase 9: 文档与归档

- [ ] 更新 `docs/conventions/agent-framework.md`（如新增 Agent 接入规范需要补充）
- [ ] 在 tasks.md 中标记所有任务完成
- [ ] 归档本 change 到 `openspec/changes/archive/`
