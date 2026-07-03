## Context

现有 orchestrator 第 361-366 行明确禁止了一个节点有多个无条件下游边（"multiple unconditional outgoing edges (not supported in MVP)"）。要实现并行调研，需要解除这个限制，并让 `build_graph` 支持 fan-out 和 fan-in。

目前 workflow 的入口节点只能有一个，串行进到下一个。改为：所有 `depends_on` 为空或已经全部就绪的节点，在入口/汇合处同时触发执行。

## Goals / Non-Goals

**Goals:**
- 并行执行：入口处的无依赖节点同时运行
- fan-out：一个节点完成后，同时触发多个下游节点
- fan-in：`depends_on` 节点等所有上游完成后才执行
- 注册 `product_research` 和 `audience_insight` 到 registry
- 拆分人群洞察 Agent 为 `audience_search` 和 `generate_persona`
- 创建并行 workflow YAML

**Non-Goals:**
- 不改变现有串行 workflow 的行为（向下兼容）
- 不引入消息队列或分布式执行（单进程并发）

## Decisions

### 1. fan-in 通过 `depends_on` 实现
- **选择**：在 `WorkflowNode` 已有的 `depends_on` 字段基础上实现，不在 YAML 层加新语法
- **理由**：`depends_on` 字段已存在，只是之前的串行实现没使用它
- **替代方案**：新加 `parallel_groups` 概念——复杂度不对等

### 2. 入口并行通过"无 depends_on 的节点自动并行"
- **选择**：所有 `depends_on` 为空的节点在入口处同时执行
- **理由**：与 `market_analysis` 的 `depends_on` 行为语义一致——无依赖就立即执行
- **替代方案**：始终需要一个 root 节点串行触发——不够灵活

### 3. 人群洞察 Agent 拆为两个 handler
- **选择**：`audience_search` handler 和 `generate_persona` handler，共享同一个 LangGraph 图的内部节点
- **理由**：两个阶段在 workflow 中地位不同——`audience_search` 与其他调研并行，`generate_persona` 等所有调研完成

## Architecture

```
入口（用户输入 product_name）
        │
   ┌────┼────┐
   ▼    ▼    ▼
 product_research  market_analysis  audience_search
 （搜产品信息）     （搜市场数据）     （搜人群数据）
   │    │    │
   └────┼────┘
        ▼
 generate_persona
（综合三个结果 → 用户画像）
        │
        ▼
       END
```

### Build Graph 修改

```python
def build_graph(workflow):
    # 1. 用 depends_on 构建依赖图（已有）
    # 2. 拓扑排序（已有）
    # 3. 构建并行入口：
    #    - 找到所有无 depends_on 的节点（root_nodes）
    #    - 如果只有一个，set_entry_point（串行兼容）
    #    - 如果有多个，创建一个虚拟 entry 节点 fan-out 到所有 root_nodes
    # 4. Fan-in：
    #    - 一个节点有多个上游时，使用 Send() API 或 barrier 模式
    #    - MVP 简化：利用 LangGraph 的 StateGraph 天然支持多输入边
```

## Risks

| Risk | Mitigation |
|------|-----------|
| 并行节点共享同一 state 导致竞争 | 各节点独立写 outputs.${node_id}，不交叉 |
| fan-in 在 LangGraph 中实现复杂 | MVP 使用简单方案：在 generate_persona 前加一个 barrier 节点 |
