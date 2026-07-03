## Context

当前有两套"编排"机制并行存在：
1. `orchestrator.build_graph()` — 用 LangGraph StateGraph 动态构建图，但功能不完整（不支持并行）
2. `workflow_run_service._execute_nodes()` — 纯 Python 手动调度，跳过 Graph，但功能更灵活

这种分裂导致：build_graph 富余的能力无人使用，手动调度却承担了全部生产流量。

本次统一方案：完善 build_graph 支持并行（fan-out多入口 + fan-in depends_on），让 `run_workflow` 改用 build_graph，移除 _execute_nodes。

第二个问题：registry handler 执行后不持久化到 mock_data。解决方案：在每个 registry handler 中加上保存逻辑，与各自 service 层的保存逻辑保持一致。

## Goals / Non-Goals

**Goals:**
- `run_workflow` 使用 `build_graph` 执行
- orchestrator 支持并行 fan-out/fan-in
- 每个 registry handler 返回前持久化到 mock_data
- 删除 workflow_run_service 中的 _execute_nodes
- 所有已有 workflow YAML 兼容

**Non-Goals:**
- 不改变现有 API 端点行为
- 不改变单个 agent 的内部 LangGraph 图

## Architecture

```
用户输入 product_name
        │
        ▼
workflow_service.run_workflow()
        │
        ▼
orchestrator.build_graph(workflow)  ← 改为统一入口
  ├── product_research  ──┐
  ├── market_analysis    ──┤ 并行
  └── audience_search    ──┘
        │
        ▼
  generate_persona  ← fan-in 等全部完成
        │
        ▼
  END
```

### Registry Handler 持久化策略

```python
async def run_product_research(state):
    pn = state["product_name"]
    result = await research_product(pn)
    # 保存到 mock_data
    _save_to_cache(pn, result)
    return result.model_dump()
```

保持与 service 层一致的保存路径和文件名。

## Decisions

### 1. 用 build_graph 替换 _execute_nodes
- **选择**：`run_workflow` 用 `build_graph` 编译执行
- **理由**：消除分裂，利用 LangGraph 原生能力
- **替代方案**：继续维护两套——复杂度不可控

### 2. Registry handler 内持久化
- **选择**：在每个 registry handler 返回前写文件
- **理由**：无论从 API 还是 workflow 调用，都保证数据落盘
- **替代方案**：在 _execute_nodes 中统一保存——但 build_graph 替代后没有这个拦截点了

## Risks

| Risk | Mitigation |
|------|-----------|
| build_graph 并行性能 | LangGraph 的 StateGraph 本身支持多入口 |
| 已有 workflow YAML 兼容 | 保持 YAML 格式不变 |
