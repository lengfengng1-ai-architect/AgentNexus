## 架构

### 当前流程（串行）

```
START → product_research → market_research → audience_insight → plan_data_query → ... → END
```

### 目标流程（并行调研 + fan-in）

```
        ┌─ product_research ─┐
START ──┼─ market_research  ─┼──→ audience_insight → plan_data_query → ... → END
        └─ audience_search  ─┘
              (并行)              (fan-in: 等三个都完成)
```

## 实现方案

### 1. 修改 `_build_graph()` 的边结构

文件: `backend/app/services/plan_generation_service.py`

```python
from langgraph.graph import START, END, StateGraph

def _build_graph() -> StateGraph:
    graph = StateGraph(PlanState)

    # 添加所有节点
    for nid in node_ids:
        graph.add_node(nid, _build_node(nid))

    # ── 并行调研阶段 ──
    graph.add_edge(START, "product_research")
    graph.add_edge(START, "market_research")
    graph.add_edge(START, "audience_search")     # 新增节点：只搜人群数据

    # ── fan-in: 三个都完成后触发画像生成 ──
    graph.add_edge("product_research", "audience_insight")
    graph.add_edge("market_research", "audience_insight")
    graph.add_edge("audience_search", "audience_insight")

    # ── 后续串行阶段不变 ──
    graph.add_edge("audience_insight", "plan_data_query")
    graph.add_edge("plan_data_query", "fitness_analysis")
    graph.add_edge("fitness_analysis", "strategy_generation")
    graph.add_edge("strategy_generation", "execution_planning")
    graph.add_edge("execution_planning", "budget_kpi")
    graph.add_edge("budget_kpi", "action_recommendations")
    graph.add_edge("action_recommendations", "plan_generator")
    graph.add_edge("plan_generator", END)

    return graph.compile()
```

### 2. PlanState 不需要 reducer

LangGraph 的 fan-in 要求：如果并行节点写**同一个** state key，需要 reducer。

但我们的三个并行节点写的是**不同的** key：
- `product_research` 节点 → 写 `state["product_research"]`
- `market_research` 节点 → 写 `state["market_research"]`
- `audience_search` 节点 → 写 `state["audience_search"]`

互不冲突，所以 `PlanState` 保持 TypedDict 就行，不需要加 `Annotated[..., reducer]`。

### 3. 新增 `audience_search` 节点

在 `PlanState` 中增加一个 key:
```python
class PlanState(TypedDict):
    brand_input: dict[str, Any]
    product_research: dict[str, Any]
    market_research: dict[str, Any]
    audience_search: dict[str, Any]      # ← 新增：人群搜索原始数据
    audience_insight: dict[str, Any]     # ← 这个变成画像生成节点
    plan_data_query: dict[str, Any]
    ...
```

`audience_search` 节点调用已注册的 `get_handler("audience_search")` handler，只做搜索不生成画像。

### 4. `audience_insight` 节点的输入改造

```python
elif node_id == "audience_insight":
    inputs = {
        "product_name": state["brand_input"].get("brand_name"),
        "product_info": state.get("product_research", {}),
        "market_info": state.get("market_research", {}),
        "audience_data": state.get("audience_search", {}),
    }
```

它汇总三个上游的结果，调 `get_handler("audience_insight")` 即 `run_generate_persona` 生成画像。

### 5. SSE 流式输出适配

`run_stream()` 中的进度事件需要能正确报告并行节点的状态。由于 LangGraph 的 `.astream()` 按节点完成顺序输出事件，三个并行节点的完成顺序不确定，SSE 事件会交错。前端已经支持按 `nodeId` 区分，不需要额外改动。

## 不改的部分

- 各 agent 的 registry handler（已有持久化逻辑）
- `run_pipeline()` 和 `run_stream()` 的外部接口
- 后续串行节点（plan_data_query 之后）
- 前端 SSE 消费逻辑
