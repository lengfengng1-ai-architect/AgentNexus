# Agent 实时操作日志 — 设计

## Context

当前流水线中每个 Agent 节点以 handler 函数注册，由 `_build_node` 包装为 LangGraph 节点：

```python
# plan_generation_service.py
async def node_fn(state: PlanState) -> dict[str, Any]:
    inputs = _node_inputs(node_id, state)
    return {node_id: await handler(inputs)}
```

`dispatch_custom_event` 在 `astream_events` 模式下可用，但只在直接由 LangGraph 调用的函数内有效——Agent 内部的嵌套 `_graph.ainvoke()` 不会让事件冒泡到外层。

影响范围：

| Agent | 调用方式 | 日志粒度 |
|-------|----------|----------|
| product_research_agent | 嵌套 `_graph.ainvoke()` | 需拆图 |
| market_research_agent | 直接 handler（4 部分 LLM 调用） | 直接加 |
| audience_insight_agent | 嵌套 `_graph.ainvoke()` | 需拆图 |
| strategy_generation_agent | 直接 handler（1 次 LLM） | 直接加 |
| execution_planning_agent | 直接 handler（1 次 LLM） | 直接加 |
| budget_kpi_agent | 直接 handler | 直接加 |
| action_recommendations_agent | 直接 handler | 直接加 |
| plan_generator_agent | 直接 handler（轮询 9 章） | 直接加 |

## Goals / Non-Goals

**Goals:**
- 每个 Agent 执行时，用户能实时看到具体操作日志（搜索关键词、访问 URL、LLM 分析等）
- `product_research_agent` 和 `audience_insight_agent` 内部步骤可见
- 后端 `_translate_event` 将 `dispatch_custom_event("log", ...)` 映射为 SSE `node.log`
- 前端自动接收并展示（复用上一轮的 LogViewer）

**Non-Goals:**
- 不改前端代码（nodeLogs 已支持 message 展示）
- 不引入新的 SSE 事件类型（只用 `node.log`，已在上轮 delta spec 中定义）
- 不做日志分级或过滤（所有日志同级别展示）

## Decisions

### Decision 1: dispatch_custom_event 使用方式

LangGraph 的 `astream_events` v2 会自动捕获调用栈中的 `dispatch_custom_event`。在 handler 函数中直接调用即可：

```python
from langgraph.types import dispatch_custom_event

# 在任何 async 上下文中
await dispatch_custom_event("log", {
    "message": "🔍 正在搜索「产品名」相关信息…"
})
```

### Decision 2: _translate_event 映射

在 `plan_generation_service.py` 的 `_translate_event` 中增加处理 `on_custom_event` + `name == "log"`：

```python
if ev_type == "on_custom_event" and name == "log":
    msg = data.get("chunk", {}).get("message", "")
    if msg:
        _counter[0] += 1
        return _sse_frame(
            event_id=_counter[0],
            event="node.log",
            data={"run_id": run_id, "node_id": "<current_node>", "message": msg},
        )
```

注意：`on_custom_event` 不携带 `name`（节点名称），需要在调用 `dispatch_custom_event` 时额外传入 `node_id`。

### Decision 3: product_research_agent 拆图

当前结构：
```python
# 现有的
_graph = _build_graph()  # search → fetch → extract → enrich
async def research_product(product_name):
    result = await _graph.ainvoke(...)
```

改为暴露内部步骤到 `run_product_research`：
```python
async def run_product_research(state):
    product = state["brand_name"]
    await dispatch_custom_event("log", {"node_id": "product_research", "message": "🔍 正在搜索「{product}」相关信息…"})
    
    # 手动调用 search → fetch → extract → enrich
    search_results = await search_node(ProductResearchState(product_name=product))
    await dispatch_custom_event("log", {"node_id": "product_research", "message": f"📄 找到 {len(search_results['search_results'])} 条结果，正在抓取页面…"})
    
    pages = await fetch_node(ProductResearchState(product_name=product, **search_results))
    for p in pages["fetched_pages"]:
        if p.fetched:
            await dispatch_custom_event("log", {"node_id": "product_research", "message": f"📄 已读取 {p.url}"})
    
    await dispatch_custom_event("log", {"node_id": "product_research", "message": "🤖 正在用 AI 分析页面内容…"})
    result = await extract_node(ProductResearchState(product_name=product, **search_results, **pages))
    
    await dispatch_custom_event("log", {"node_id": "product_research", "message": "🌐 正在补充官网信息…"})
    enriched = await enrich_website_node(ProductResearchState(product_name=product, **search_results, **pages, output=result["output"]))
    
    await dispatch_custom_event("log", {"node_id": "product_research", "message": "✓ 产品调研完成"})
    return ...result...
```

同样的方式用于 `audience_insight_agent`。

### Decision 4: node.log SSE 数据帧格式

```
id: <N>
event: node.log
data: {"run_id": "<uuid>", "node_id": "product_research", "message": "🔍 正在搜索「XPS 15」相关信息…"}
```

前端 `usePlanRun.ts` 的 SSE 解析逻辑已自动提取 `data.message` 作为日志消息，不需要额外改动。

## Risks / Trade-offs

- [中] `product_research_agent` 和 `audience_insight_agent` 拆图后脱离了原来的内置 `_graph`, 不再使用 checkpointer 做节点级恢复——对于这两个 agent 本身是一次性执行、没有中断点，所以实际不影响行为
- [低] `dispatch_custom_event` 的 `data` 字段不是强类型，拼写错误在前端表现为日志缺失——通过测试覆盖
- [低] 日志消息频繁推送时 SSE 帧数增加，但每条消息很小（<200 字节），对带宽无影响
