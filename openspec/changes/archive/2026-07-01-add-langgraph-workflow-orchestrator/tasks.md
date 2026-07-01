## 1. OpenSpec 与规范

- [x] 1.1 创建 `docs/api/workflows.yaml`，定义工作流列表、查询、运行 API 契约
- [x] 1.2 创建 `docs/conventions/agent-registry.md`，说明 Agent 节点如何接入底座

## 2. Schemas

- [x] 2.1 创建 `backend/app/schemas/workflow.py`，实现 WorkflowRunRequest、WorkflowRunResponse、WorkflowDefinition、WorkflowNode、WorkflowEdge、WorkflowSummary 等模型

## 3. Agent 注册与编排核心

- [x] 3.1 创建 `backend/app/agents/registry.py`，实现 register/get_handler/list_agents/clear
- [x] 3.2 创建 `backend/app/agents/orchestrator.py`，实现 WorkflowState、build_graph、拓扑排序、节点 wrapper
- [x] 3.3 修改 `backend/app/agents/chat_extraction_agent.py`，新增 `run_chat_extraction(state)` 并注册 `chat_extraction`
- [x] 3.4 修改 `backend/app/agents/__init__.py`，import chat_extraction_agent 触发注册

## 4. Service 与 Router

- [x] 4.1 创建 `backend/app/services/workflow_service.py`，实现 YAML 加载、校验、运行工作流
- [x] 4.2 创建 `backend/app/routers/workflows.py`，实现 list/get/run 三个端点
- [x] 4.3 修改 `backend/app/main.py`，挂载 workflows 路由

## 5. 示例工作流

- [x] 5.1 创建 `backend/workflows/brand_input_extraction.yaml`，作为首个可运行工作流示例

## 6. 测试

- [x] 6.1 创建 `backend/tests/test_agents/test_registry.py`，覆盖注册/查询/异常
- [x] 6.2 创建 `backend/tests/test_agents/test_orchestrator.py`，覆盖单节点、多节点、循环、未注册 Agent
- [x] 6.3 创建 `backend/tests/test_services/test_workflow_service.py`，覆盖 YAML 加载、校验、运行
- [x] 6.4 创建 `backend/tests/test_routers/test_workflows.py`，覆盖 200/400/404/422/500

## 7. 验证

- [x] 7.1 运行 `cd backend && uv run pytest -v --cov=app --cov-report=term-missing`，确保覆盖率 ≥80%
- [x] 7.2 启动服务后调用 `POST /api/v1/workflows/brand_input_extraction/run` 验证端到端流程
