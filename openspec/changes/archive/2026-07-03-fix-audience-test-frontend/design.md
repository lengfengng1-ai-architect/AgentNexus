## Context

后端 `POST /api/v1/audience-insight/stream` 使用 sse-starlette 的 EventSourceResponse，事件格式：

```
event: progress
data: {"step": "search", "message": "正在搜索..."}

event: progress
data: {"step": "search_done", "message": "找到 5 个相关页面"}

event: progress
data: {"step": "fetch", "index": 1, "total": 3, "message": "正在读取 (1/3): ..."}

event: progress
data: {"step": "extract", "message": "LLM 正在提取人群数据..."}

event: progress
data: {"step": "persona", "message": "LLM 正在生成用户画像..."}

event: result
data: {AudienceInsightResponse JSON}

event: error
data: 错误消息字符串
```

请求体：`{ "product_name": "xxx" }`

后端执行流程为单 agent 内部 4 个串行节点：search → fetch → extract_audience → generate_persona。

## Goals / Non-Goals

**Goals:**
- 前端适配后端实际的 `/audience-insight/stream` 端点和事件格式
- 展示 4 步执行进度（搜索 → 读页 → 提取 → 画像）
- 展示每步的实时日志消息
- result 事件到达后展示完整用户画像

**Non-Goals:**
- 不改后端
- 不做三 Agent 并行可视化（后端不支持）
- 不添加新的后端端点

## Decisions

### 1. 进度可视化采用纵向步骤条

三列并行卡片不再适用（后端是串行），改为纵向 4 步进度条。每一步对应后端的一个阶段：

| 步骤 | 对应 step 值 | 显示名称 |
|------|-------------|---------|
| 1 | search / search_done | 搜索人群信息 |
| 2 | fetch | 读取页面 |
| 3 | extract | 提取人群数据 |
| 4 | persona | 生成用户画像 |

**为什么不继续用三列**：后端只有一个 agent 在跑，没有独立的 product_research / market_analysis / audience_search 三个并行节点。强行展示三列只会全是空的。

### 2. SSE 解析使用 EventSource 原生格式

后端用 sse-starlette，标准 SSE 格式（`event:` + `data:` 字段），不再是自定义的 `id:\nevent:\ndata:` 三行组合。解析逻辑简化为按 `event` 字段分发。

### 3. 状态管理用 useReducer

保持与现有代码风格一致。状态结构从"按 nodeId 分组"改为"按 step 分组"。

## Risks / Trade-offs

- [风险] 缓存命中时后端只发 `progress(cache)` + `result`，前端需要处理跳过所有中间步骤直达结果的情况 → 收到 result 事件时直接跳到完成状态
- [取舍] 放弃并行可视化，换取与后端的一致性。如果未来后端改为并行，前端需要再次重构
