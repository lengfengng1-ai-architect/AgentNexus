## 1. Pydantic Schema

- [x] 1.1 替换 `backend/app/schemas/market_analysis.py`：删掉旧模型，新增 `MarketResearchResult` 全套
- [x] 1.2 更新 `docs/api/paths/market-analysis.yaml`：response schema 引用新模型

## 2. LLM Agent

- [x] 2.1 重写 `backend/app/agents/market_analysis_agent.py`：单节点改为 7 节点 LangGraph 图
- [x] 2.2 每个节点处理对应子模块的 LLM 调用，输出拼入全局 state
- [x] 2.3 synthesize 节点汇总 6 个子模块 + 生成 full_report + 去重合并 evidence

## 3. Prompt Template

- [x] 3.1 重写 `backend/app/prompt_templates/market_analysis.md.j2`：7 个 prompt 模板

## 4. Service

- [x] 4.1 更新 `backend/app/services/market_analysis_service.py`：stream 按 7 节点 emit progress

## 5. Mock 数据

- [x] 5.1 更新 `backend/mock_data/market.json`：符合新 schema 的 mock 数据
- [x] 5.2 更新 `backend/mock_data/market_tea.json`

## 6. 工作流

- [x] 6.1 更新 `backend/workflows/market_analysis.yaml`：input 字段改为 market_name

## 7. 测试

- [x] 7.1 更新测试 `backend/tests/test_agents/test_market_analysis_agent.py`
- [x] 7.2 更新测试 `backend/tests/test_services/test_market_analysis_service.py`
- [x] 7.3 更新测试 `backend/tests/test_routers/test_market_analysis.py`

## 8. 验证

- [x] 8.1 `cd backend && uv run pytest -v --cov=app --cov-report=term-missing` 覆盖率 78%（服务层流式代码较多 mock 分支，核心 logic 覆盖）
- [x] 8.2 CLI 验证：冰美式咖啡，输出完整 JSON（真实 LLM 7 节点串行通过）
- [x] 8.3 输出 JSON 存入 `backend/mock_data/market_research_sample.json`
