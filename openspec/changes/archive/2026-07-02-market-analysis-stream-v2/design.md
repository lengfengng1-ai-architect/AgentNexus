## Context

当前 `analyze_stream` 的实现：

```python
# service 层
async def analyze_stream(...):
    for node_key, progress in RESEARCH_NODES:
        yield progress_event(...)           # 伪流式：先一口气发完 progress
    result = await research_market(...)     # 然后等全部跑完
    yield result_event(...)                 # 最后发 result
```

真正的问题：`research_market()` 内部串行 7 个 LLM 调用，service 层在它完成前没有任何干预机会。

改法：把 7 个 LLM 调用从 Agent 提到 Service，每个调完后立即 yield。

## Goals / Non-Goals

**Goals：**
- 每完成一个节点（约 10-30s），客户端收到包含该节点结构化数据的 SSE data 事件。
- 所有节点完成后，仍然发一个 result 事件包含完整 `MarketResearchResult`。
- mock 模式保持当前行为不变（全量 mock，无需逐节点 mock）。
- 同步端点不变。

**Non-Goals：**
- 不改前端（前端可选消费 data 事件，也可以等 result 事件再渲染）。
- 不改后端 API 路由路径和参数。

## Decisions

1. **Agent 提取为公共函数库**
   当前 agent 文件里 `_llm_json` / `_render` / `_build_model` 等函数已经是工具性质的，提取出每个节点的调用函数 `call_node_define(mn, cat)` / `call_node_size(mn, d1)` 等，service 和 agent 的 `research_market` 都复用它们。

   ```
   agents/market_analysis_agent.py
     ├── _llm_json()          ← 工具函数，不变
     ├── _render()            ← 工具函数，不变
     ├── call_node_define()   ← 新增导出函数
     ├── call_node_size()     ← 新增导出函数
     ├── call_node_trends()   ← 新增导出函数
     ├── call_node_users()    ← 新增导出函数
     ├── call_node_competitors() ← 新增导出函数
     ├── call_node_assess()   ← 新增导出函数
     ├── call_node_synthesize() ← 新增导出函数
     ├── research_market()    ← 复用以上函数，保持同步全量
     └── run_market_analysis() ← registry 入口，不变
   ```

2. **SSE 事件协议**

   ```
   每个节点发 3 个事件：
   event: progress
   data: {"node": "define", "progress": 14, "stage": "市场边界定义"}

   event: data
   data: {"node": "define", "result": {...市场定义的结构化数据...}}

   event: node_end
   data: {"node": "define", "status": "completed"}

   全部完成后发：
   event: result
   data: {完整 MarketResearchResult}
   ```

   `node_end`事件让客户端精确知道该节点数据已完整送达。
   `result`事件保持向后兼容——现有前端不消费 `data`/`node_end`，只等 `result` 也能正常工作。

3. **错误处理**
   某节点 LLM 调用失败，发 `node_end` 带 `status: "failed"` + error 信息，继续执行下一节点。不中断整个流。

## Processing Model

```
Service: analyze_stream(market_name, category)
  │
  ├─ [mock 模式] → 发模拟 progress 事件 → 发完整 result
  │
  └─ [真实模式]
       │
       ├─ call_node_define()
       │   → yield progress("define")
       │   → yield data("define", {included_scope, excluded_scope, ...})
       │   → yield node_end("define", "completed")
       │
       ├─ call_node_size(d1)
       │   → yield progress("size")
       │   → yield data("size", {tam, sam, som, cagr, ...})
       │   → yield node_end("size", "completed")
       │
       ├─ call_node_trends(d2)
       │   → yield progress("trends")
       │   → yield data("trends", [...trend_signals])
       │   → yield node_end("trends", "completed")
       │
       ├─ call_node_users(d3)
       │   → yield progress("users")
       │   → yield data("users", [...target_users])
       │   → yield node_end("users", "completed")
       │
       ├─ call_node_competitors(d4, d5)
       │   → yield progress("competitors")
       │   → yield data("competitors", [...competitors])
       │   → yield node_end("competitors", "completed")
       │
       ├─ call_node_assess(d5)
       │   → yield progress("assess")
       │   → yield data("assess", {market_attractiveness, ...})
       │   → yield node_end("assess", "completed")
       │
       ├─ call_node_synthesize(all)
       │   → yield progress("synthesize")
       │   → yield data("synthesize", {full_report})
       │   → yield node_end("synthesize", "completed")
       │
       └─ assemble full result
           → yield result({完整 MarketResearchResult})
```

## SSE 事件示例

```
event: progress
data: {"node":"define","progress":14,"stage":"市场边界定义"}

event: data
data: {"node":"define","result":{"included_scope":["连锁咖啡门店...","便利店..."],"excluded_scope":["热美式","冷萃..."],...}}

event: node_end
data: {"node":"define","status":"completed"}

event: progress
data: {"node":"size","progress":28,"stage":"市场规模估算"}

...

event: result
data: {"result":{"market_name":"冰美式咖啡",...,"full_report":"# ..."}}
```

## Risks / Trade-offs

- **SSE data 事件量大**：每个节点的结构化数据可能较大（如 competitors 3 个品牌各带 5 个字段），但不影响 streaming 性能。
- **部分数据依赖前序节点**：size 依赖 define 输出，trends 依赖 size，依此类推。串行是必须的，不能并行。
- **node_end 事件是新增类型**：现有前端解析 `event: result` 和 `event: progress` 不受影响，无需修改前端代码。
