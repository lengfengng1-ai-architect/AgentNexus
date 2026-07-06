## Context

当前方案生成 pipeline 串行调用 10 个 agent，只有 3 个节点设置了 `interrupt_before`（strategy_generation、execution_planning、plan_generator），其余 7 个 agent 自动执行无人工干预。用户希望每个 agent 执行完成后都能查看结果，确认后再继续，并可选择重新执行。

已有机制：
- LangGraph Checkpoint: 使用 AsyncSqliteSaver + interrupt，已支持 pause/resume
- 前端 SSE: `workflow.paused` 事件已实现，`approve`/`reject` API 已存在
- PipelineTimeline: 已展示 10 个 agent 状态，支持展开查看日志
- Tab: 当前按方案章节分组（1项目概述～9预算），与 agent 无一一对应

## Goals / Non-Goals

**Goals:**
- 每个 agent 执行完后自动 pause，等待用户确认
- 弹出确认框展示 agent 执行结果摘要（已有输出），提供"确认继续"和"重新执行"按钮
- Tab 栏从章节 tab 改为 agent tab（10 个），当前执行到的 agent 高亮
- 点击 tab 滚动到 PipelineTimeline 中对应 agent 行
- 支持用户点击已完成的 agent 重新打开确认框查看

**Non-Goals:**
- 不修改 agent 内部执行的业务逻辑
- 不修改方案预览（PlanPreview）的展示方式
- 不引入新的数据库或持久化机制
- 不做 agent 结果编辑功能（"重新执行"是重新跑，不是编辑）

## Decisions

### 1. 后端：全部 10 个 agent 改为 interrupt_after

当前图结构使用 `interrupt_before=[strategy_generation, execution_planning, plan_generator]`。新的图结构使用 `interrupt_after=[全部 10 个 agent]`。

```
方案:
  graph.compile(checkpointer=saver, interrupt_after=_NODE_ORDER)
```

这样每个 agent 执行完输出存入 state 后立即 pause，stream 结束，前端收到 `workflow.paused` 事件。

**为什么不是 interrupt_before + 每个节点前加一个确认节点？**
- interrupt_after 更简洁，无需修改图拓扑
- interrupt_after 执行完节点后才 pause，此时 `state[node_id]` 已有完整输出，前端可以展示结果
- 工作流恢复时 resume value 传空即可，无需额外逻辑

### 2. 新增 agent.complete SSE 事件

当前 `on_chain_end + name in _NODE_LABELS` 发送 `node.complete` 事件。保留这个事件，但另外发送 `agent.complete` 事件携带更完整的执行摘要，方便前端确认框展示。

agent.complete 事件数据格式:
```json
{
  "event": "agent.complete",
  "data": {
    "run_id": "...",
    "node_id": "product_research",
    "label": "产品调研",
    "output_summary": {  // 关键输出摘要
      "product_name": "Nike",
      "brand_info": "..."
    }
  }
}
```

### 3. 后端：新增重新执行 API

在 approve（确认继续）的基础上，新增 `rerun` API：

```
POST /api/v1/plan/runs/{run_id}/rerun
```

逻辑：
- 从 checkpoint 恢复 state
- 找到当前 pause 在哪个节点（next[0]）
- 清空 state 中该节点的输出（state[node_id] = {}）
- 用 Command(resume={}) 重新 resume，LangGraph 会重新执行当前节点

### 4. 前端：确认对话框

在 PipelineTimeline 中，当 `status === 'paused'` 时自动弹出模态对话框：

```
┌────────────────────────────────────────┐
│ Agent 执行完成                          │
│                                        │
│  ┌ 产品调研 Agent ── 执行完毕 ──────┐  │
│  │                                    │  │
│  │ 品牌: Nike                         │  │
│  │ 品类: 运动鞋                       │  │
│  │ 官网: nike.com                    │  │
│  └──────────────────────────────────┘  │
│                                        │
│     [!] 确认继续     [↻] 重新执行       │
└────────────────────────────────────────┘
```

- `workflow.paused` 事件触发时自动打开
- 点击已完成 agent 可手动打开
- 用户点击"确认继续" → 调 approve API → SSE stream 继续 → 下一个 agent 执行
- 用户点击"重新执行" → 调 rerun API → 当前 agent 重新执行

### 5. 前端：Tab 与 Agent 映射

Tab 改为 10 个：

| 索引 | Tab | 对应 Agent |
|------|-----|-----------|
| 0 | 概览 | product_research |
| 1 | 市场研究 | market_research |
| 2 | 人群洞察 | audience_insight |
| 3 | 平台资源 | plan_data_query |
| 4 | 适配度分析 | fitness_analysis |
| 5 | 策略生成 | strategy_generation |
| 6 | 执行规划 | execution_planning |
| 7 | 预算KPI | budget_kpi |
| 8 | 行动建议 | action_recommendations |
| 9 | 方案生成 | plan_generator |

Tab 高亮规则：
- 当前 `running` 的 agent → 对应 tab 高亮
- 已完成的 agent → 对应 tab 显示完成标记（✓）
- 点击 tab → document.querySelector(`[data-agent-id="${agentId}"]`).scrollIntoView()

### 6. 点击已完成 agent 重新打开确认框

用户可点击 PipelineTimeline 中已完成的 agent（状态为 complete），如果该 agent 的输出可用，弹出确认框展示结果。这个操作**不会重新执行 agent**，只是方便用户回顾查看。

## Risks / Trade-offs

- **[中断频率高]** 10 个 agent 都需要确认 → 用户体验受影响，如果用户想跳过可以在前端加"自动确认"开关 → 本期不做，后续迭代
- **[中断性能]** 每次 checkpoint 写 SQLite，10 次 pause 增加 10 次 IO → 影响可忽略（SQLite 单次写入 <1ms）
- **[重新执行的一致性]** agent 重新执行时上游输入不变，但前一次执行的副作用已写入 checkpoint → 重新执行会覆盖之前的输出，但不会影响其他节点的已保存输出
- **[后端重启后 checkpoint 丢失]** 当前 SQLite 路径是相对路径 `data/checkpoints.db`，容器重启可能丢失 → MVP 阶段接受，后续引入持久化存储

## Open Questions

1. "重新执行"按钮调用 rerun API 后，前端是否需要显示"重新执行中"的状态？
   → 暂定：调用 rerun 后重新进入 SSE stream，前端自动更新状态
