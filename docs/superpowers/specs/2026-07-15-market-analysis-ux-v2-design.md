# 市场分析 UX 改进 V2 — 设计文档

## 概述

两处市场分析功能的用户体验改进：
1. 用户点击「开始分析」后按钮立即消失，而非等待分析完成才消失
2. 分析过程中将搜索/抓取日志实时推送到气泡内滚动展示，增加操作透明度

## 改动 1：按钮点击后立即消失

### 现状

`ChatContainer.handleStartMarketResearch` 中，点击按钮后仅显示"正在启动…"进度文本，按钮仍可见。按钮在 SSE `result` 事件到达后才通过 `setMarketResearchDone(msgId)` 清除（上一轮归档的变更）。

### 改动

在 `handleStartMarketResearch` 中，`updateMessageContent('🔍 正在启动…')` 之后、`fetch` 发起之前，立即调用 `setMarketResearchDone(msgId)`。

```typescript
// ChatContainer.tsx — handleStartMarketResearch
updateMessageContent(msgId, '🔍 正在启动市场分析…')
setMarketResearchDone(msgId)  // ← 点击即清除按钮
```

同时保留 result 事件处的兜底调用（已有，不做改动）。

### 影响范围

- `frontend/src/components/ChatContainer.tsx` — +1 行

## 改动 2：实时搜索日志 SSE 流

### 现状

`market_analysis_agent` 每个内部节点（define/size/trends/users/competitors/assess/synthesize）已有 `write_log()` 调用，写入全局 `_log_buffer`（`llm_utils.py` 定义）。但这些日志仅用于后端调试日志，未通过 SSE 流推送到前端。前端 SSE 事件目前仅处理 `progress`、`data`、`node_end`、`result` 四类事件。

### 改动

#### 2a. 后端 — 排空日志到 SSE 流

`market_analysis_service.py` 的 `analyze_stream` 函数中，在每个 `astream_events` 事件翻译后，排空当前 `_log_buffer` 并发射为新的 `event: log` SSE 事件。

```python
# market_analysis_service.py — analyze_stream
async for event in _graph.astream_events(state, None, version="v2"):
    translated = _translate_event(event, market_name, category)
    if translated is not None:
        yield translated

    # 排空 write_log 缓冲，作为 log 事件输出
    for entry in drain_logs():
        yield f"event: log\ndata: {json.dumps(entry, ensure_ascii=False)}\n\n"
```

SSE 事件格式：
```
event: log
data: {"node_id": "market_research", "message": "📄 正在请求 https://www.example.com…"}
```

#### 2b. 前端 — 接收并展示日志

`ChatContainer` 的 SSE 循环新增 `event === 'log'` 处理：解析 `message` 字段，追加到当前的 `progressLines` 数组，通过 `updateMessageContent` 更新气泡文本。

```typescript
// ChatContainer.tsx — SSE 循环中
if (event === 'log' && data) {
    try {
        const p = JSON.parse(data)
        const logMsg = p.message || ''
        if (logMsg) {
            progressLines.push(logMsg)
            updateMessageContent(msgId, progressLines.join('\n'))
        }
    } catch { /* ignore */ }
}
```

#### 2c. 前端 — 滚动容器

`ChatBubble` 中分析中状态（即 `message.intent === 'market_research' && isStreaming` 时的进度日志）使用 `overflow-y-auto` 滚动容器，让搜索日志在有限空间内滚动展示。分析完成后切换回 Markdown 渲染（已有逻辑，来自上一轮归档变更）。

```tsx
// ChatBubble.tsx — 分析中状态
{isMarketResearch && isStreaming ? (
    <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed sm:text-base">
        {message.content}
    </div>
) : isMarketResearch && message.content ? (
    /* 已有的 marked.parse + market-report 样式 */
    <div className="market-report ..." dangerouslySetInnerHTML={...} />
) : (
    /* 默认 whitespace-pre-wrap */
    <div className="whitespace-pre-wrap ...">{message.content}</div>
)}
```

### 影响范围

| 层 | 文件 | 改动 |
|---|------|------|
| 后端 | `backend/app/services/market_analysis_service.py` | `analyze_stream` 中新增 `drain_logs()` 排空 |
| 前端 | `frontend/src/components/ChatContainer.tsx` | SSE 循环新增 `event: log` 处理 |
| 前端 | `frontend/src/components/ChatBubble.tsx` | 分析中状态加 `overflow-y-auto` 滚动容器 |

## 不涉及

- 后端 agent 代码修改
- prompt 模板修改
- data model / schema 修改
- 新 npm 或 pip 依赖
- API 路由变更
- 测试框架修改
