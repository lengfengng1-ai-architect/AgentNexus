## Context

当前系统已有 `chat_extraction_agent` 实现品牌需求提取，并通过 `workflow-orchestration` 底座注册和编排。市场分析 Agent 将复用同一套架构：

- Agent 入口函数 `run_market_analysis(state: dict) -> dict`，符合底座规范；
- 通过 `agents/__init__.py` import 触发注册；
- 工作流 YAML 定义节点和输入映射。

## Goals / Non-Goals

**Goals:**
- 提供 `POST /api/v1/market-analysis` 同步端点，返回完整的四维市场分析报告。
- 提供 `POST /api/v1/market-analysis/stream` SSE 流式端点，逐步推送分析进度。
- Agent 内实现 4 个分析维度：行业趋势、趋势信号、消费者洞察、竞争格局。
- MVP 阶段支持 mock 模式（`USE_MOCK_DATA=true`）。

**Non-Goals:**
- 不接入第三方付费数据。
- 不做竞品分析功能（注意：`competitive_landscape` 维度是分析公开已知的竞争对手，与 out_scope 的竞品分析**功能**不同）。
- 不实现前端展示。
- 不涉及方案自动执行。

## Decisions

1. **Agent 使用 LangGraph + structured output，不引入 DeepAgents**
   - 选择原因：市场分析的逻辑是"搜索→收集→合成"，不需要 task planning、subagent 委派或人机协同。直接用 LangGraph 图 + `with_structured_output` 更轻量。
   - 替代方案：使用 DeepAgents `create_deep_agent`；但会增加复杂度和依赖，MVP 不需要。

2. **同步和流式两套端点分开实现**
   - 选择原因：同步端点直接返回完整报告，流式端点逐步推送进度事件，职责清晰。同步端点内部直接调用 Agent，流式端点使用 FastAPI `StreamingResponse` + `EventSourceResponse` 模式。
   - SSE 事件格式：`progress` 事件带 `stage` 和 `progress` 字段，`result` 事件带完整报告。

3. **4 维分析在单个 Agent 图内串行搜索**
   - 选择原因：每个维度的搜索依赖前序结果做综合判断（如消费者洞察需要参考行业趋势结论），串行利于保持分析一致性。
   - 后续扩展：如需独立并发搜索，可将每个维度拆为独立节点，通过 workflow 底座并行编排。

4. **Mock 模式：`market_analysis_service` 层判断 `USE_MOCK_DATA`**
   - 选择原因：与现有 `chat_service` 模式一致，在 service 层决定使用 mock 还是调用 Agent。
   - Mock 数据文件：`backend/mock_data/market.json`，包含完整的 4 维分析报告。

5. **搜索使用 Bing 搜索 API**
   - 选择原因：已确认 DuckDuckGo 替换为 Bing，搜索结果更稳定。
   - 实现方式：service 层封装搜索调用，Agent 接收已搜索的内容做 LLM 合成。

6. **API YAML 放在 `docs/api/paths/market-analysis.yaml`**
   - 选择原因：后续 `/docs/api/paths/` 将成为标准路径组组织方式，与 `directory-structure.md` 中 `brands.yaml`、`data.yaml` 等平级。

## Processing Model

### 同步端点流程
```
POST /api/v1/market-analysis
  → router 校验 MarketAnalysisRequest
  → market_analysis_service.analyze(brand_name, category)
    → [USE_MOCK_DATA=true] 读取 mock_data/market.json 返回
    → [USE_MOCK_DATA=false] 调用 market_analysis_agent
      → LangGraph 图：搜索 4 维数据 → LLM 合成 → MarketAnalysisReport
  → 返回 MarketAnalysisResponse
```

### SSE 流式端点流程
```
POST /api/v1/market-analysis/stream
  → router 校验 MarketAnalysisRequest
  → StreamingResponse(market_analysis_service.analyze_stream(brand_name, category))
    → [mock 模式] 发送模拟的 progress 事件 + 最终 result 事件
    → [非 mock 模式] 每完成一个维度搜索，emit progress → 全部完成后 emit result
  → 流结束
```

### SSE 事件格式
```
event: progress
data: {"stage": "searching_industry", "progress": 25}

event: progress
data: {"stage": "searching_trend", "progress": 50}

event: progress
data: {"stage": "searching_consumer", "progress": 75}

event: progress
data: {"stage": "searching_competitive", "progress": 90}

event: progress
data: {"stage": "analyzing", "progress": 95}

event: result
data: {"report": {"industry_trends": ..., ...}, "confidence": "high"}
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/market-analysis` | 同步返回市场分析报告 |
| POST | `/api/v1/market-analysis/stream` | SSE 流式推送分析进度 + 结果 |

## Risks / Trade-offs

- **[Risk]** 搜索源可靠性：Bing 搜索 API 可能限流或返回空结果。
  - **Mitigation**: service 层捕获搜索异常，降级返回 LLM 推理结果（标注 `"LLM 推理"` 作为 source）。
- **[Risk]** SSE 连接中断：流式操作中客户端可能断开。
  - **Mitigation**: 使用 FastAPI `StreamingResponse` 原生支持，不需要额外心跳。
- **[Risk]** 分析耗时：4 维搜索 + LLM 合成可能超过 30 秒。
  - **Mitigation**: SSE 模式让用户看到进度；同步模式设置合理超时。

## Open Questions

1. 搜索结果的缓存策略？MVP 阶段不缓存，后续如需可引入简单的 LRU 缓存。
2. `confidence` 的计算标准？MVP 阶段根据搜索结果数量和相关性 LLM 自行判断返回 "high"/"medium"/"low"。
