## Why

当前 `make_emit` 函数中，SSE 事件被错误编码为纯 JSON 字符串（`{"event":"...","data":{...}}`）放入队列，而前端 SSE 解析器期望标准的 `event:...\ndata:...\n\n` 格式。结果：前端收不到任何 `tool_call_start`/`search_result`/`tool_call_end`/`progress`/`data` 等事件，**PC 端和移动端的搜索来源卡片滚动效果、节点进度更新、状态条展示全部失效**。

这是 2026-07-15 提交的 market-analysis-search-sync change 中引入的 bug。

## What Changes

仅改动 `backend/app/agents/tools/event_stream.py` 中的 `make_emit` 函数：

- 将 `json.JSONEncoder.encode()` 替换为 `build_sse_frame()`，使 emit 输出标准 SSE 帧格式

## Capabilities

### New Capabilities

无

### Modified Capabilities

- `market-analysis`: 修复 SSE 事件格式，确保 frontend 能正确解析所有事件类型

## Impact

| 文件 | 说明 |
|------|------|
| `backend/app/agents/tools/event_stream.py` | `make_emit` 中一行改动：`payload = encoder.encode(...)` → `payload = build_sse_frame(event, data)` |
