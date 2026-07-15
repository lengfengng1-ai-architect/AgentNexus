## Context

当前 `make_emit` 函数输出的是纯 JSON 字符串，但前端解析器（`useMarketResearchStream.ts` 中的 `event:`/`data:` 行解析逻辑）期望标准 SSE 格式。这个不匹配导致所有通过 emit 推送的事件在前端被静默丢弃。

## Goals / Non-Goals

**Goals:**
- 修复 SSE 帧格式，使 PC 端和移动端的搜索来源卡片滚动、节点进度、状态条正常展示

**Non-Goals:**
- 不改动前端解析逻辑（前端已经正确实现）
- 不改动 `build_sse_frame` 函数
- 不改动已有 `drain_logs` 路径（已使用 `build_sse_frame`，格式正确）

## Decisions

**Fix**: `make_emit` 中将 `json.JSONEncoder.encode()` 改为 `build_sse_frame()`。

```python
# Before:
def emit(event: str, data: dict) -> None:
    payload = encoder.encode({"event": event, "data": data})
    queue.put_nowait(payload)

# After:
def emit(event: str, data: dict) -> None:
    queue.put_nowait(build_sse_frame(event, data))
```

**解释**：`build_sse_frame` 已经存在于同一文件中，输出格式为 `event: x\ndata: {...}\n\n`。前端 `useMarketResearchStream` 的解析逻辑按 `\n\n` 切分后逐行检查 `event:` 和 `data:` 前缀，两者完全匹配。

**注意**：`encoder` 变量（`json.JSONEncoder(ensure_ascii=False)`）在修改后不再需要，可一并移除。

## Risks / Trade-offs

**风险**：无。这是纯 bug 修复，一行改动，影响范围仅限 `make_emit` 的输出格式。语法上 `build_sse_frame` 返回 str，队列元素类型从 str 变为 str（不变），consumer 端无需任何适配。
