## Why

当前项目只有一个独立的 `chat_extraction_agent`，多名成员正在并行开发市场调研、方案生成等 Agent，但缺少统一的 LangGraph 编排底座。为了让大家写的 Agent 节点能直接注册进主流程、通过 YAML 配置工作流，而不需要每个人都改 orchestrator 代码，需要引入可配置的工作流编排能力。

## What Changes

- 新增 `docs/api/workflows.yaml`：定义工作流列表、查询、运行 API 契约。
- 新增 `docs/conventions/agent-registry.md`：Agent 节点接入底座的开发规范。
- 新增 `backend/app/agents/registry.py`：Agent 注册表，支持按名称注册/查找 handler。
- 新增 `backend/app/agents/orchestrator.py`：可配置 LangGraph 编排器，按 YAML 定义构建图并串行执行节点。
- 新增 `backend/app/services/workflow_service.py`：加载并校验 YAML 工作流，运行编排。
- 新增 `backend/app/routers/workflows.py`：工作流 HTTP 路由。
- 新增 `backend/app/schemas/workflow.py`：工作流相关 Pydantic schemas。
- 修改 `backend/app/agents/__init__.py`：自动注册 `chat_extraction` Agent。
- 修改 `backend/app/agents/chat_extraction_agent.py`：新增 `run_chat_extraction(state)` 适配底座的入口函数。
- 修改 `backend/app/main.py`：挂载 `workflows` 路由。
- 新增 `backend/workflows/brand_input_extraction.yaml`：首个可运行示例工作流。
- 新增测试文件覆盖 registry、orchestrator、workflow service、workflow router，目标覆盖率 ≥80%。

## Capabilities

### New Capabilities

- `workflow-orchestration`: 可配置 LangGraph 工作流编排底座，支持注册 Agent 节点、按 YAML 定义工作流并运行。

### Modified Capabilities

- `plan-generation-chat-preview`: 现有 chat extraction agent 增加适配底座的入口函数，能力契约不变。

## Impact

- 后端新增 `/api/v1/workflows` 路由组，不影响现有 `/api/v1/chat`。
- Agent 开发者后续只需实现 `run_<agent_name>(state: dict)` 并在 `agents/__init__.py` 中 import，无需修改主流程。
- 工作流定义文件集中在 `backend/workflows/*.yaml`，便于产品经理或主流程负责人调整编排。

## Non-goals

- 不实现竞品分析 Agent 节点（`superpowers.yaml` 中 `competitor-analysis` 为 out_scope）。
- 不实现工作流持久化、状态恢复、人机协同（MVP 阶段不实现，接口可预留）。
- 不实现前端界面（后续独立 change）。
- 不实现并行执行节点（MVP 阶段串行执行，后续独立 change 扩展）。
