## Context

当前流程：用户输入 → 后端返回 market_research intent + marketName + category → ChatBubble 渲染"开始分析"按钮 → 用户手动点击 → 发起 SSE 流。

目标：去掉用户点击步骤。后端返回 `market_research` intent 且 `missingFields.length === 0` 时自动触发 SSE 流。

但自动触发有架构约束：`sendMessage` 在 `useChat` 中执行，SSE 流请求在 `ScreenChat`/`ChatContainer` 中各自实现。合理的设计是让 `useChat` 暴露一个 `autoStartMarketResearch` callback，在 `INTENT_RECEIVED` 处理后自动调用。

## Goals / Non-Goals

**Goals:**
- 移除按钮
- `market_research` + 字段齐全 → 自动开始分析

**Non-Goals:**
- 不改动后端
- 不改动 `handleStartMarketResearch` 中 SSE 流的消费逻辑

## Decisions

### 方案：screen 层自动触发

不做自动触发，改为 ScreenChat/ChatContainer 的 `useEffect` 监听消息变化：

```
useEffect(() => {
  for (const msg of messages) {
    if (msg.canStartMarketResearch && !marketResearchActiveIds.has(msg.id)) {
      handleStartMarketResearch(msg.id)
    }
  }
}, [messages])
```

**理由**：SSE 流请求的 `handleStartMarketResearch` 已经在 screen 层，不需要把它的逻辑搬到 `useChat`。用 `useEffect` 监听 `messages` 变化 + `marketResearchActiveIds` 防重复触发即可。

## Risks / Trade-offs

| 风险 | 缓解 |
|---|---|
| useEffect 可能多次触发 | `marketResearchActiveIds` 防重 |
