# 市场分析 Agent 搜索联动机 + 滚动展示 · 设计文档

- **日期**: 2026-07-15
- **状态**: 设计确认，待实现
- **对应能力**: market-analysis
- **对应 OpenSpec**: `openspec/specs/market-analysis/spec.md`

---

## 1. 目标

1. 实现 PC 端、移动端、后端市场分析的联动与适配。
2. 当识别到用户意图为市场分析且必要字段已填充时，前端展示**滚动的「网页搜索」状态 + 来源卡片**动画。
3. 消除 `ChatContainer` 和 `ScreenChat` 之间约 120 行重复的 SSE 处理代码。

## 2. 核心机制

Agent 后端在执行搜索时，通过 SSE 向前端推送 4 类新增事件，与现有事件体系共存：

```
已有事件: progress / data / node_end / log / result
新增事件: tool_call_start / search_result / tool_call_end / content_delta
```

### 单节点内时序

```
节点开始:
  progress       → 前端显示 "📋 市场边界定义…"

多轮搜索（每节点 2-3 个关键词）:
  tool_call_start(search_id, query)  → 前端显示 "🌐 网页搜索：XX" + spinner
  search_result(search_id, title, url) → 前端追加来源卡片 + 自动滚动
  search_result(...)
  tool_call_end(search_id)           → 前端收起对应搜索条

  tool_call_start(...)               → 下一轮搜索
  search_result(...)
  tool_call_end(...)

LLM 生成:
  content_delta(node, text) ×N      → 前端逐段追加报告文本

节点结束:
  data(node, result)                 → 前端缓存结构化数据
  node_end(node, status)             → 前端标记节点完成
```

## 3. 架构变更

### 3.1 EventBus — asyncio.Queue 替换 astream_events

当前 `analyze_stream` 依赖 LangGraph `astream_events`，无法实时捕获节点内部事件。改造为 **手动顺序节点循环 + asyncio.Queue 实时推送**：

```python
# 入口函数
async def analyze_stream(market_name, category):
    event_queue = asyncio.Queue()
    
    def emit(ev_type, data):
        event_queue.put_nowait(json.dumps({"event": ev_type, "data": data}))
    
    async def _run_nodes():
        # 顺序执行 7 个节点，通过 emit() 实时推送
        ...
    
    task = asyncio.create_task(_run_nodes())
    
    # 主循环：从 queue 取出事件 → yield SSE
    while True:
        raw = await event_queue.get()
        if raw is None: break
        yield f"event: {raw['event']}\ndata: ..."
```

### 3.2 节点改造 — 内部真实 web_search

每个 `call_node_*` 函数增加：
1. **`emit` 回调参数**：由 `analyze_stream` 注入
2. **搜索关键词列表**：每节点 2-3 个相关关键词
3. **真实 web_search 调用**：基于 `searxng_search`
4. **搜索结果注入 Prompt context**：原 `_llm_json` → `_llm_json_stream`（增加 content_delta 推送）

### 3.3 `_graph`（StateGraph）与新流的关系

| 路径 | 说明 |
|------|------|
| `analyze_stream`（流式） | 弃用 `_graph.astream_events`，改用**手动顺序节点 + asyncio.Queue** |
| `research_market`（同步） | 保持 `call_node_*` 函数直调，不经过 `_graph` |
| `_graph` + `_build_state_graph` | 当新 streaming 路径验证通过后，`_graph` 可移除；过渡期保留不做任何改动 |

**`_llm_json` vs `_llm_json_stream`**：同步路径保留 `_llm_json` 不变。流式路径使用 `_llm_json_stream`（新增），二者的唯一区别是流式版本在生成过程中 push content_delta 事件。两者共享相同的 model 实例和 prompt template。

### 3.3 Prompt 模板改造

每个 `research_*.md.j2` 增加 `search_context` 变量占位，LLM 生成时基于真实搜索结果而非幻觉。

## 4. 前端改造

### 4.1 `useMarketResearchStream` hook（🆕 新增）

提取 `ChatContainer` 和 `ScreenChat` 中完全重复的 SSE 处理逻辑：

```typescript
export function useMarketResearchStream() {
  const abortRef = useRef<AbortController | null>(null)
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set())
  const [activeSearches, setActiveSearches] = useState<SearchState[]>([])

  const startMarketResearch = useCallback(
    async (msgId: string, marketName: string, category: string) => {
      // fetch SSE 流 → switch 处理 11 种事件类型
      // 自动管理 activeSearches / activeIds 状态
    }, []
  )

  // 自动触发逻辑（messages 变化时检测 canStartMarketResearch）

  return { startMarketResearch, activeIds, activeSearches }
}
```

### 4.2 组件改造

| 组件 | 改动 |
|------|------|
| `MarketResearchProgressCard` | 新增 ToolCallStatusBar 区域；来源卡片 slideIn 动画 |
| `ToolCallStatusBar`（🆕） | 显示当前搜索关键词 + spinner（支持多条并发） |
| `SourceCard`（🆕） | 单条来源卡片：favicon + title + url + snippet |
| `ChatContainer` | 删除 ~70 行重复代码，改用 hook |
| `ScreenChat` | 删除 ~70 行重复代码，改用 hook |

## 5. 文件变更清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `backend/app/agents/market_analysis_agent.py` | 🔧 | 每个 `call_node_*` 增加 emit 参数 + web_search + content_delta |
| `backend/app/services/market_analysis_service.py` | 🔧 | `analyze_stream` 重写为 asyncio.Queue 模式 |
| `backend/app/agents/tools/event_stream.py` | 🆕 | SSEManager / emit 工具函数 |
| `backend/app/prompt_templates/research_*.md.j2` ×7 | 🔧 | 增加 `search_context` 变量 |
| `frontend/src/hooks/useMarketResearchStream.ts` | 🆕 | 公共 SSE 处理 hook |
| `frontend/src/components/MarketResearchProgressCard.tsx` | 🔧 | 新增搜索条 + 动画 |
| `frontend/src/components/ToolCallStatusBar.tsx` | 🆕 | 搜索状态条 |
| `frontend/src/components/SourceCard.tsx` | 🆕 | 来源卡片 |
| `frontend/src/components/ChatContainer.tsx` | 🔧 | 删除重复代码 |
| `frontend/src/pages/mobile-workbench/ScreenChat.tsx` | 🔧 | 删除重复代码 |

## 6. SSE 事件 Schema

```typescript
// tool_call_start
{ "tool": "web_search", "query": string, "search_id": string }

// search_result
{ "search_id": string, "title": string, "url": string, "snippet": string }

// tool_call_end
{ "tool": "web_search", "query": string, "search_id": string, "result_count": number }

// content_delta
{ "node": string, "text": string }

// progress（保留不变）
{ "node": string, "progress": number, "stage": string }

// data（保留不变）
{ "node": string, "result": Record<string, unknown> }

// node_end（保留不变）
{ "node": string, "status": "completed"|"failed", "error"?: string }

// log（保留不变）
{ "node_id": string, "message": string }

// result（保留不变）
{ "result": MarketResearchResult, ... }
```

## 7. 边界 & 错误处理

| 情况 | 处理方式 |
|------|---------|
| 搜索失败（网络/超时） | 记 log + 继续下一轮搜索，不给 LLM 注入失败搜索的结果 |
| 全部搜索失败 | LLM 基于已有知识生成，仍然标记节点完成 |
| 节点 LLM 生成失败 | emit `node_end { status: "failed", error }` |
| 用户中途离开/取消 | AbortController.abort() 终止 fetch |
| 移动端断网重连 | 重新触发，前端基于 `marketResearchSources` 去重 |
