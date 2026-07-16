## Why

当前市场分析 Agent 的 7 个节点（定义→规模→趋势→用户→竞争→评估→合成）内部**没有执行真实的 web_search**，来源 URL 是 LLM 从自身知识中正则提取的。这导致两个问题：

1. **数据合规风险**：LLM 编造的来源 URL 不符合 `docs/superpowers.yaml` 中"数据必须来自搜索或 mock，LLM 不可编造"的规则
2. **用户体验差**：用户在 PC 端和移动端的市场分析过程中看不到"正在搜索"的实时反馈——搜索来源卡片和节点进度是事后一次性展示的，缺乏滚动感

**为什么现在做**：市场分析是 Chat 对话流程的关键 Capability，当前已有搜索来源展示框架（MarketResearchProgressCard/MarketResearchResultCards），亟需填充真实的 web_search 引擎，并用实时 SSE 事件让整个搜索过程对用户可见。

## What Changes

1. **后端：每个节点内执行真实 web_search** — 每个 `call_node_*` 函数生成 2-3 个搜索关键词，调用 `searxng_search`，将搜索结果注入 LLM prompt 作为上下文
2. **SSE 事件体系扩展** — 新增 4 种事件类型（`tool_call_start`/`search_result`/`tool_call_end`/`content_delta`），与现有 `progress`/`data`/`node_end`/`log`/`result` 共存
3. **EventBus 改造** — `analyze_stream` 从 LangGraph `astream_events` 改为 asyncio.Queue + 手动顺序节点循环，确保节点内部事件可实时推送
4. **前端消除重复** — 提取 `useMarketResearchStream` 公共 hook，消除 ChatContainer 和 ScreenChat 之间约 120 行重复的 SSE 解析代码
5. **前端 UI 增强** — 新增 ToolCallStatusBar 组件显示实时搜索状态，来源卡片带 slideIn 动画，content_delta 逐段输出分析文本

## Capabilities

### New Capabilities

无新增 Capability，本 change 增强已有 `market-analysis` 能力。

### Modified Capabilities

- `market-analysis`:
  - 搜索来源从"LLM 正则提取"改为"真实 web_search 工具调用 + SSE 实时推送"
  - SSE 事件类型从 5 种扩展为 9 种（新增 tool_call_start/search_result/tool_call_end/content_delta）
  - 每个分析节点增加"关键词生成→web_search→LLM 生成"三步流程

## Impact

| 模块 | 影响 |
|------|------|
| `backend/app/agents/market_analysis_agent.py` | 每个 `call_node_*` 函数改造，新增 `_llm_json_stream` |
| `backend/app/services/market_analysis_service.py` | `analyze_stream` 重写为 asyncio.Queue 模式 |
| `backend/app/prompt_templates/research_*.md.j2` ×7 | 每个模板增加 `search_context` 变量 |
| `frontend/src/hooks/useMarketResearchStream.ts` | 🆕 新增公共 hook |
| `frontend/src/components/MarketResearchProgressCard.tsx` | 改造：增加 ToolCallStatusBar |
| `frontend/src/components/ChatContainer.tsx` | 删除 ~70 行重复代码，改用 hook |
| `frontend/src/pages/mobile-workbench/ScreenChat.tsx` | 删除 ~70 行重复代码，改用 hook |

**API 兼容性**：`POST /market-analysis`（同步）和 `POST /market-analysis/stream`（SSE）端点路径不变。SSE 事件流向后兼容——新增事件不会破坏现有前端（旧版前端仅忽略不认识的事件类型）。

**缓存**：`_save_cache` 保留不变，同步/流式端点均可利用缓存。
