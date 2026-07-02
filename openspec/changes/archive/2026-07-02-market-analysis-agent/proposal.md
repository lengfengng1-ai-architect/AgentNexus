## Why

营销方案生成需要市场数据支撑。当前系统能提取品牌需求（`brand-input`）和查询平台数据（`data-query`），但缺少基于品牌品类的外部市场分析能力。市场分析 Agent 将填补这一空白，为方案生成环节提供行业趋势、消费者洞察和竞争格局输入。

## What Changes

- 新增 `docs/api/paths/market-analysis.yaml`：定义同步查询和 SSE 流式两套 API 契约。
- 新增 `backend/app/schemas/market_analysis.py`：MarketAnalysisRequest、MarketAnalysisReport、MarketAnalysisResponse 等 Pydantic 模型。
- 新增 `backend/app/agents/market_analysis_agent.py`：LangGraph 图 + 4 维搜索 + LLM 合成。
- 新增 `backend/app/services/market_analysis_service.py`：编排 Agent 调用，支持 mock 模式。
- 新增 `backend/app/routers/market_analysis.py`：同步 `POST /api/v1/market-analysis` + SSE 流式 `POST /api/v1/market-analysis/stream`。
- 新增 `backend/workflows/market_analysis.yaml`：注册到工作流编排底座。
- 新增 `backend/mock_data/market.json`：mock 模式下的市场分析数据。
- 新增 prompt 模板 `backend/app/prompt_templates/market_analysis.md.j2`。
- 修改 `backend/app/agents/__init__.py`：import market_analysis_agent 触发注册。
- 新增测试覆盖 200/400/422/500，覆盖率 ≥80%。

## Capabilities

### New Capabilities

- `market-analysis`: 基于品牌名称和品类，进行行业趋势、趋势信号、消费者洞察和竞争格局四维市场分析，支持同步查询和 SSE 流式进度推送。

## Impact

- 后端新增 `/api/v1/market-analysis` 路由组，不影响现有 `/api/v1/chat` 和 `/api/v1/workflows`。
- 复用已有的 `workflow-orchestration` 底座实现 Agent 注册和工作流编排。
- SSE 流式端点使用 `text/event-stream`，前端可实时展示分析进度。

## Non-goals

- 不做竞品分析功能（`superpowers.yaml` 中 `competitor-analysis` 为 out_scope）。
- 不实现跨平台数据接入（抖音/小红书等）。
- 不实现效果归因系统。
- 不实现前端界面（后续独立 change）。
- 不接入第三方付费数据。
