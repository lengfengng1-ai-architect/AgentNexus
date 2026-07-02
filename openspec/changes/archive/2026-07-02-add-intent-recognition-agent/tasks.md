## 1. OpenSpec 与 API 契约

- [x] 1.1 创建 `docs/api/paths/intent.yaml`，定义意图识别节点的请求/响应契约
- [x] 1.2 更新 `docs/api/paths/workflows.yaml`，补充 `condition` 字段说明

## 2. 扩展 Workflow Schema 与 Orchestrator

- [x] 2.1 在 `backend/app/schemas/workflow.py` 的 `WorkflowNode` 中新增 `condition: str | None` 字段
- [x] 2.2 在 `backend/app/agents/orchestrator.py` 中实现 `_resolve_pointer` 对 `$.state` 的完整支持
- [x] 2.3 实现 `_evaluate_condition` 函数，支持 `==`、`in`、`and`、`or`
- [x] 2.4 修改 `build_graph`，对带 `condition` 的节点使用 LangGraph 条件边路由
- [x] 2.5 添加跳过节点时的日志记录

## 3. 新增 Intent Recognition Agent

- [x] 3.1 创建 `backend/app/schemas/intent.py`，定义 `IntentRecognitionOutput` schema
- [x] 3.2 创建 `backend/app/prompt_templates/intent_recognition.md.j2` Jinja2 模板骨架
- [x] 3.3 创建 `backend/app/agents/intent_recognition_agent.py`，实现 `run_intent_recognition` 入口
- [x] 3.4 在 `backend/app/agents/__init__.py` 中注册 `intent_recognition` 到 registry

## 4. 新增 Data Query Agent

- [x] 4.1 准备 `backend/mock_data/allygo_city_data.json` 城市 mock 数据（如不存在）
- [x] 4.2 创建 `backend/app/schemas/data_query.py`，定义 `DataQueryOutput` schema
- [x] 4.3 创建 `backend/app/services/data_provider.py`，抽象 `DataProvider` 接口与 `MockDataProvider` 实现
- [x] 4.4 创建 `backend/app/agents/data_query_agent.py`，实现 `run_data_query` 入口
- [x] 4.5 在 `backend/app/agents/__init__.py` 中注册 `data_query` 到 registry

## 5. 新建 chat-pipeline 工作流

- [x] 5.1 创建 `backend/workflows/chat_pipeline.yaml`，包含 `intent_recognition` 节点和三个条件分支
- [x] 5.2 验证 YAML 能被 `workflow_service` 正确加载
- [x] 5.3 确保工作流在不满足条件时正确跳过节点

## 6. 测试

- [x] 6.1 编写 `backend/tests/test_agents/test_intent_recognition.py`，覆盖 5 类意图输出
- [x] 6.2 编写 `backend/tests/test_agents/test_data_query.py`，覆盖正常查询、缺 city、不存在城市
- [x] 6.3 编写 `backend/tests/test_agents/test_orchestrator_conditions.py`，覆盖条件边构建与分支跳过
- [x] 6.4 编写 `backend/tests/test_services/test_chat_pipeline.py`，覆盖工作流端到端运行
- [x] 6.5 运行 `uv run pytest`，确保覆盖率 ≥80%

## 7. 文档与归档

- [x] 7.1 更新 `docs/conventions/agent-registry.md`，补充意图识别 Agent 接入示例
- [x] 7.2 运行 `openspec validate --change add-intent-recognition-agent`
- [x] 7.3 运行 `openspec archive` 或 `/opsx:archive add-intent-recognition-agent` 归档变更
