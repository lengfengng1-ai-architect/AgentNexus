## Context

当前市场分析 Agent 的 `call_node_*` 函数直接调用 `_llm_json`，LLM 凭自身知识生成分析内容，来源 URL 仅从文本正则提取。前端 MarketResearchProgressCard 虽然已经支持搜索来源和进度日志两个窗口，但来源数据来自 `data` 事件中后处理提取的 evidence，**没有真实 web_search 过程**。

现状概览：

- 后端 7 个串行节点：define → size → trends → users → competitors → assess → synthesize
- 流式端点 `POST /market-analysis/stream`，通过 LangGraph `astream_events` 推送 `progress/data/node_end/log/result`
- 前端两套独立的 SSE 处理逻辑（ChatContainer.tsx 和 ScreenChat.tsx 各有约 70 行重复代码）
- Prompt 模板（`research_*.md.j2` ×7）不含 web_search 结果注入

## Goals / Non-Goals

**Goals:**
- 每个分析节点内部执行 2-3 轮真实 web_search，搜索结果实时推送 SSE
- 新增 `tool_call_start` / `search_result` / `tool_call_end` / `content_delta` 事件类型
- 前端提取公共 hook 消除重复，搜索条带实时状态和动画
- 移动端（`variant='mobile'`）样式同步适配

**Non-Goals:**
- 不新增节点或改变 7 节点串行拓扑
- 不改变同步 `/market-analysis` 端点的行为
- 不引入 EventSource（保持 fetch + ReadableStream 模式）
- 不作为 LangGraph 的 ReAct Agent（节点仍为命令式函数）
- 不涉及 Mock 模式改造（现有 mock 路径保持不变）

## Decisions

### 1. EventBus: asyncio.Queue → 替代 astream_events

**决策**：`analyze_stream` 不再使用 `_graph.astream_events`，改为手动顺序节点循环 + asyncio.Queue。

**理由**：`astream_events` 只在 on_tool_start/on_chain_end 等 LangGraph 生命周期事件暴露，无法捕获 `call_node_*` 内部（搜索循环、LLM 流式生成）的中间状态。改造后每个节点函数通过 `emit` 回调将事件写入 Queue，主生成器从 Queue 实时 yield SSE。

**`_graph` 保留**：同步路径 `research_market()` 仍然直调 `call_node_*` 函数，不经过 `_graph`。当新增 streaming 路径验证稳定后，`_graph` 和 `_build_state_graph` 可移除；过渡期保留不动。

### 2. 事件推送通道: emit 回调注入

**决策**：每个 `call_node_*` 函数增加 `emit: Callable[[str, dict], None]` 参数，由 `analyze_stream` 注入。

**理由**：回调模式比全局变量或 contextvar 更显式、可测试、类型安全。每个节点函数内部通过 emit("search_result", {...}) 实时推送，无需关心数据流去向。

### 3. LLM 流式生成: `_llm_json_stream`（新增）

**决策**：新增 `_llm_json_stream` 函数，与同步路径的 `_llm_json` 共存。

**理由**：同步路径不需要 content_delta 推送，streaming 路径需要。两者共享相同 model 实例和 prompt template，区别仅在于 streaming 版本在生成过程中 push content_delta 事件。

两者实现路径：

```python
同步: _llm_json(system_prompt, user_msg) → 返回 dict
流式: _llm_json_stream(system_prompt, user_msg, node_name, emit) → 返回 dict + 通过 emit 推送 content_delta
```

### 4. 前端 hook: useMarketResearchStream

**决策**：将 ChatContainer 和 ScreenChat 中完全重复的 SSE fetch/解析/事件分发的约 120 行代码提取为公共 hook。

**理由**：两份代码逻辑完全相同（区别仅在于 ChatContainer 有 BrandConfirmCard 交互）。提取 hook 后两组件各减约 70 行，且新增事件类型只需在一个地方维护。

### 5. 搜索关键词策略

**决策**：每个节点的搜索关键词硬编码在 `call_node_*` 函数中。

**理由**：7 个节点的搜索需求是确定的（定义→搜行业范围/分类标准；规模→搜市场规模/增长数据；等等），不需要 LLM 动态生成关键词减少一次调用。后续如需更智能的关键词，可在 `keywords_generator` 节点预生成。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| asyncio.Queue 替换 astream_events 后，失去 LangGraph 的自动重试/回退机制 | 节点逻辑简单（顺序无分支），手动重试在 emit 层处理 |
| 每个节点调用 2-3 次 web_search × 7 节点 = 14-21 次搜索，延迟增加 | web_search 设 max_results=5（减量不减质）；搜索失败直接跳过不堵塞节点 |
| content_delta 按段落拆分可能导致报告结构断裂 | 按完整段落 `\n\n` 拆分，每段一个事件；保留原始 JSON 解析 |
| 消重 hook 后 ChatContainer 需要额外暴露 `handleGeneratePlan` 等非市场分析交互 | hook 只取市场分析相关 dispatch 方法，其他回调保持原位 |
