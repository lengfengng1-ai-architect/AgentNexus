## Why

当前 workflow 执行存在两个问题：
1. **调度脱节**：`workflow_run_service._execute_nodes()` 手动循环调 handler，绕过了 `orchestrator.build_graph()`，没有利用 LangGraph 的 StateGraph 机制，导致串行执行而非真正的并行 fan-out/fan-in
2. **数据不落盘**：registry handler 直接返回结果，跳过了 service 层的 mock_data 缓存逻辑，导致通过 workflow 调用时产品调研/市场分析/人群洞察的结果都不保存到 mock_data 目录

本次重构将 `run_workflow` 改为使用 `orchestrator.build_graph()`（改造为支持并行），并在每个 registry handler 返回前将结果持久化到对应的 mock_data 目录。

## What Changes

- **BREAKING**：`backend/app/services/workflow_service.py` 的 `run_workflow` 改用 `build_graph` 执行，不再使用 `_execute_nodes` 手动调度
- `backend/app/agents/orchestrator.py` 完善并行支持：fan-out 多入口节点 + fan-in 通过 `depends_on` 等待上游
- `backend/app/agents/product_research_agent.py`：`run_product_research` handler 返回前保存到 `mock_data/product_info/`
- `backend/app/agents/audience_insight_agent.py`：`run_audience_search` 返回前保存到 `mock_data/audience_insight/`，`run_generate_persona` 返回前保存到 `mock_data/user_persona/`
- 删除 `workflow_run_service._execute_nodes` 中的手动调度逻辑（已被 `build_graph` 替代）

## Capabilities

### Modified Capabilities

- `workflow-orchestration`: 编排器从手动调度改为统一的 `build_graph` 执行，支持并行 fan-out/fan-in。每个 agent handler 返回前自动持久化到 mock_data。

## Impact

- `backend/app/agents/orchestrator.py`：完善并行支持
- `backend/app/agents/product_research_agent.py`：registry handler 增加持久化
- `backend/app/agents/audience_insight_agent.py`：registry handler 增加持久化
- `backend/app/services/workflow_service.py`：`run_workflow` 改用 `build_graph`
- `backend/app/services/workflow_run_service.py`：移除重复的手动调度逻辑（`_execute_nodes`）
- `backend/tests/`：更新相关测试
