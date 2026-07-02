## Why

当前市场分析 Agent 的输出 schema（`MarketAnalysisReport`）是平铺式四维结构，字段语义不够精确、缺少证据溯源链。真实的营销方案生成需要市场研究的每一句话都可追溯来源，同时也需要分段输出让用户看到分析推进过程。

## What Changes

- 全部 Pydantic schema 替换为 `MarketResearchResult` 模型（五类核心字段：market_definition、market_size、trend_signals、target_users、competitors + evidence）。
- 评分字段降级为 `high/medium/low` 三级制。
- 对接工作流编排底座，将单节点拆为 7 个分段节点（define → size → trends → users → competitors → assess → synthesize）。
- 每个节点完成后 SSE stream 推送 progress 事件。
- 保留 `full_report` 拼接逻辑，供前端现存组件继续使用。
- 不再支持 `brand_name` 输入（那是竞品字段），改为 `market_name` 作为输入。
- 测试产出 JSON 存入 `backend/mock_data/`。

## Capabilities

### New Capabilities

- `market-research-schema-v2`: 结构化市场研究输出模型，含市场边界定义、TAM/SAM/SOM 估算、证据溯源链，支持节点分段流式输出。

## Impact

- `backend/app/schemas/market_analysis.py`：全部替换（新增 MarketResearchResult，保留 MarketAnalysisRequest/ProgressEvent）。
- `backend/app/agents/market_analysis_agent.py`：单节点 LLM 调用 → 7 节点 LangGraph 图，按序执行，每节点输出拼入 state。
- `backend/app/services/market_analysis_service.py`：stream 逻辑改为按节点维度 emit progress。
- `backend/app/prompt_templates/market_analysis.md.j2`：按新 schema 重写。
- `docs/api/paths/market-analysis.yaml`：response schema 更新。
- `backend/workflows/market_analysis.yaml`：输入字段改为 `market_name`。
- 测试：mock JSON 替换为符合新 schema 的格式。
- 前端 types 暂不更新（用户不用前端展示）。

## Non-goals

- 不做前端展示更新（用户命令行验证即可）。
- 不做真实搜索 API 集成（用户自行配置 API key）。
- 不做多轮对话式追问（一次输入，全量输出）。
