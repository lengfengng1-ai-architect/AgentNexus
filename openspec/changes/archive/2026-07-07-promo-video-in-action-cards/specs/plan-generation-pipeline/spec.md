# Capability: plan-generation-pipeline — Delta Spec

## MODIFIED Requirements

### Requirement: 系统 SHALL 提供 plan_generation_pipeline 工作流

系统 SHALL 提供 `plan_generation_pipeline` 流水线，包含 10 个 Agent 节点（`product_research` / `market_research` / `audience_insight` / `plan_data_query` / `fitness_analysis` / `strategy_generation` / `execution_planning` / `budget_kpi` / `action_recommendations` / `plan_generator`），使用 LangGraph `StateGraph` 在代码中定义（不再使用 YAML）。流水线 SHALL 挂载 `AsyncSqliteSaver` checkpointer 并声明 `interrupt_before` 审核点，通过 `POST /api/v1/plan/run` 启动。

## ADDED Requirements

### Requirement: action_recommendations 节点完成后 SHALL 异步触发宣传视频生成

action_recommendations 节点 handler 返回后，系统 SHALL 自动读取当前 state（brand_input、strategy_generation）并拼接 prompt，以 `asyncio.create_task` 方式后台启动 HappyHorse 视频生成任务。此异步任务 SHALL 不阻塞流水线后续节点执行。

#### Scenario: 异步任务生命周期
- **GIVEN** action_recommendations 节点执行成功
- **WHEN** handler 返回后
- **THEN** 系统 SHALL 立即拼接 prompt 并创建后台 video generation task
- **AND** plan_generator 节点 SHALL 继续执行，不受后台任务影响

### Requirement: 视频 SHALL 通过 get_status 端点与 outputs 合并返回

视频生成结果 SHALL 缓存于服务端内存（`_promo_video_cache`，key 为 run_id），通过 `GET /plan/runs/{run_id}/status` 端点与 outputs 合并返回。

#### Scenario: get_status 包含 promo_video
- **WHEN** 客户端调用 `GET /plan/runs/{run_id}/status`
- **THEN** 响应中的 `outputs` SHALL 包含 `promo_video` 字段
- **AND** promo_video 字段 SHALL 包含 `status`（generating / completed / failed）
- **AND** status 为 completed 时 SHALL 包含 `video_url`
