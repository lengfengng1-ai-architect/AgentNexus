## 1. PlanState 增加 audience_search key

- [ ] 1.1 在 `PlanState` TypedDict 中增加 `audience_search: dict[str, Any]`

## 2. 修改 `_build_graph()` 边结构

- [ ] 2.1 将前三个节点改为从 START 并行出发（fan-out）
- [ ] 2.2 三个调研节点汇合到 `audience_insight`（fan-in）
- [ ] 2.3 后续节点保持串行不变

## 3. 增加 audience_search 节点构建

- [ ] 3.1 在 `_build_node()` 中增加 `audience_search` 的 input 映射
- [ ] 3.2 在 `_NODE_LABELS` 和 `_NODE_LOG_STEPS` 中增加 `audience_search`
- [ ] 3.3 在 `node_ids` 列表中增加 `audience_search`

## 4. 修改 audience_insight 节点输入

- [ ] 4.1 `audience_insight` 节点从 state 中读取 `product_research`、`market_research`、`audience_search` 的输出

## 5. 测试

- [ ] 5.1 单元测试验证图结构（并行节点从 START 出发，fan-in 到 audience_insight）
- [ ] 5.2 运行全量测试确认无回归
