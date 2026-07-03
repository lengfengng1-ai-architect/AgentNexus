## 1. 移除简单 JSON mock（7 个 agent）

- [x] 1.1 `action_recommendations_agent.py`
- [x] 1.2 `budget_kpi_agent.py`
- [x] 1.3 `execution_planning_agent.py`
- [x] 1.4 `strategy_generation_agent.py`
- [x] 1.5 `plan_generator_agent.py`
- [x] 1.6 `fitness_analysis_agent.py`
- [x] 1.7 `plan_data_query_agent.py`

## 2. 移除复杂 Agent 的 mock

- [x] 2.1 `market_analysis_agent.py`
- [x] 2.2 `audience_insight_agent.py`

## 3. 提取 intent_recognition mock 到独立文件

- [x] 3.1 创建 `mock_intent_recognition_agent.py`
- [x] 3.2 在 `__init__.py` 中注册
- [x] 3.3 移除 `intent_recognition_agent.py` 中的 mock 代码

## 4. 更新测试文件

- [x] 4.1 移除或更新依赖 `use_mock_data` 的测试
- [x] 4.2 创建 `tests/test_agents/test_mock_intent_recognition.py`（测试引用 `mock_intent_recognition_agent`）

## 5. 更新文档

- [x] 5.1 更新 `agent-registry.md`
- [x] 5.2 更新 `agent-framework.md`
- [ ] 5.3 更新 `agent-node-dev-guide.md`
- [x] 5.4 更新 `directory-structure.md`
