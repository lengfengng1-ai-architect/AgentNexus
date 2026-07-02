## 1. OpenSpec 与规范

- [x] 1.1 创建 `docs/api/paths/market-analysis.yaml`，定义同步和 SSE 流式两端点 API 契约

## 2. Schemas

- [x] 2.1 创建 `backend/app/schemas/market_analysis.py`，实现：
  - `MarketAnalysisRequest(brand_name, category)`
  - `IndustryTrends`（gdp_change, market_scale, summary）
  - `TrendSignal`（signal, assessment: positive/neutral/negative, source）
  - `ConsumerInsight`（shift, changes: list[str], source）
  - `Competitor`（brand_name, product_highlights, pricing, source）
  - `CompetitiveLandscape`（competitors: list[Competitor]）
  - `MarketAnalysisReport`（industry_trends, trend_signals, consumer_insights, competitive_landscape, full_report）
  - `MarketAnalysisResponse`（report, confidence）
  - SSE 事件模型 `MarketAnalysisProgressEvent`（stage, progress）

## 3. Mock 数据

- [x] 3.1 创建 `backend/mock_data/market.json`，包含四维分析 mock 数据

## 4. Prompt 模板

- [x] 4.1 创建 `backend/app/prompt_templates/market_analysis.md.j2`

## 5. Agent

- [x] 5.1 创建 `backend/app/agents/market_analysis_agent.py`：
  - LangGraph 图实现，4 维搜索 + LLM 合成
  - 注册 `market_analysis` 到 registry
  - 实现 `run_market_analysis(state)` 适配底座入口

## 6. Service

- [x] 6.1 创建 `backend/app/services/market_analysis_service.py`：
  - `analyze(brand_name, category)`：同步分析入口
  - `analyze_stream(brand_name, category)`：SSE 流式分析入口
  - mock 模式分支

## 7. Router

- [x] 7.1 创建 `backend/app/routers/market_analysis.py`：
  - `POST /api/v1/market-analysis`：同步端点
  - `POST /api/v1/market-analysis/stream`：SSE 流式端点
- [x] 7.2 修改 `backend/app/main.py`：挂载 `market_analysis` 路由

## 8. 工作流定义

- [x] 8.1 创建 `backend/workflows/market_analysis.yaml`，注册到编排底座
- [x] 8.2 修改 `backend/app/agents/__init__.py`：import market_analysis_agent 触发注册

## 9. 测试

- [x] 9.1 创建 `backend/tests/test_agents/test_market_analysis_agent.py`
- [x] 9.2 创建 `backend/tests/test_services/test_market_analysis_service.py`
- [x] 9.3 创建 `backend/tests/test_routers/test_market_analysis.py`，覆盖 200/400/422/500

## 10. 验证

- [x] 10.1 运行 `cd backend && uv run pytest -v --cov=app --cov-report=term-missing`，确保覆盖率 ≥80% （88% ✅）
- [x] 10.2 启动服务后调用同步和流式端点验证端到端流程
