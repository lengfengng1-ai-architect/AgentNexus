## Context

当前方案生成 pipeline 通过 YAML → orchestator → service → router 4 层配置实现。聊天功能则是直接调函数（`stream_intent_recognition()`）。两套路径不一致。LangGraph 官方推荐在代码里直接用 `StateGraph` 定义执行图，去掉中间配置层。

## Goals / Non-Goals

**Goals:**
- 删除 `orchestrator.py`、`workflows/`、`workflow_service.py`、`workflow_run_service.py`、`routers/workflows.py`、`schemas/workflow.py`
- 新建 `services/plan_generation_service.py`，用 `StateGraph` 定义方案生成 pipeline
- 删除的测试文件一并移除
- 更新文档

**Non-Goals:**
- 不改变 agent 注册机制（`registry.py` 保留）
- 不修改任何 agent 文件
- 不修改聊天路径

## Decisions

### 新 service 结构

`services/plan_generation_service.py` 用 `StateGraph` 定义图，每个节点直接调 `get_handler(agent_name)`：

```python
class PlanState(TypedDict):
    brand_input: dict
    product_research: dict
    market_research: dict
    audience_insight: dict
    plan_data_query: dict
    fitness_analysis: dict
    strategy_generation: dict
    execution_planning: dict
    budget_kpi: dict
    action_recommendations: dict
    plan_generator: dict

graph = StateGraph(PlanState)
# ...add nodes and edges...
pipeline = graph.compile()
```

前端工作流 SSE 端点改为直接调 `services/plan_generation_service.py::run_stream()`，生成 SSE 事件。

### 删除文件

| 文件 | 替代 |
|------|------|
| `app/agents/orchestrator.py` | `plan_generation_service.py` |
| `workflows/*.yaml` | 代码定义 |
| `app/services/workflow_service.py` | `plan_generation_service.py` |
| `app/services/workflow_run_service.py` | `plan_generation_service.py` |
| `app/routers/workflows.py` | 路由移到 chat 或独立 plan router |
| `app/schemas/workflow.py` | 不再需要 |

## Risks / Trade-offs

- [低] 不能再通过改 YAML 调整节点顺序——改为改代码，但当前只有一条 pipeline，灵活性没有实际需求
