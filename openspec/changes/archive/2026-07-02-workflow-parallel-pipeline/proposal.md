## Why

现有 workflow 编排器（orchestrator）只支持串行节点执行，无法实现并行调研。产品调研、市场分析、人群搜索三个 Agent 的调研阶段互不依赖，串行执行浪费时间。需要给 orchestrator 加上并行支持（fan-out / fan-in），并将三个 Agent 注册并编排为并行 pipeline。

## What Changes

- 修改 `backend/app/agents/orchestrator.py`：支持无条件多下游边（fan-out），允许多个节点并行执行
- `backend/app/agents/__init__.py`：注册 `product_research` 和 `audience_insight` agent 到 registry
- 修改 `backend/app/agents/audience_insight_agent.py`：拆分为两个独立 handler——`audience_search`（搜人群数据）和 `generate_persona`（基于多方数据生成画像）
- 新增 `backend/workflows/audience_insight_pipeline.yaml`：编排并行 workflow
- 新增 `backend/app/agents/product_research_handler.py`（或直接在 agent 文件底部加 registry handler）
- 新增 `backend/tests/test_orchestrator_parallel.py`：并行功能测试

## Capabilities

### Modified Capabilities

- `workflow-orchestration`: 编排器从纯串行升级为支持并行 fan-out/fan-in。workflow 节点可以通过 `depends_on` 显式声明依赖，无依赖的节点并行执行。

## Impact

- `backend/app/agents/orchestrator.py`：`build_graph` 函数修改，支持多下游无条件边
- `backend/app/agents/__init__.py`：新增 `product_research` 和 `audience_insight` 注册
- `backend/app/agents/audience_insight_agent.py`：拆分为 `audience_search` 和 `generate_persona` 两个 handler
- `backend/app/agents/product_research_agent.py`：底部新增 registry handler 函数
- `backend/workflows/audience_insight_pipeline.yaml`：新增并行 workflow 定义
- `backend/tests/`：新增并行编排测试
