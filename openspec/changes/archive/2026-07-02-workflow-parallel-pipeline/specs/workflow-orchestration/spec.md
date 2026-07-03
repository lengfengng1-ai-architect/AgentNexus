## MODIFIED Requirements

### Requirement: 工作流可以按拓扑顺序串行或并行执行
系统 SHALL 根据 YAML 中的边构建有向无环图。支持两类执行：
1. **串行**：一个节点完成后执行下一个节点（现有行为）
2. **并行 fan-out**：一个节点完成后同时触发多个下游节点
3. **并行 fan-in**：一个节点声明 `depends_on` 后，等所有上游节点完成才执行

无 `depends_on` 的节点在入口处同时并行执行。

#### Scenario: 三个调研节点并行执行
- **GIVEN** 工作流包含节点 `product_research`、`market_analysis`、`audience_search`
- **AND** 三者均无 `depends_on` 且从同一入口开始
- **WHEN** 运行该工作流
- **THEN** 三个节点 SHALL 并发执行
- **AND** 总执行时间约等于最慢的单个节点

#### Scenario: fan-in 节点等待所有上游完成
- **GIVEN** 工作流包含节点 `product_research`、`market_analysis`、`audience_search` 和 `generate_persona`
- **AND** `generate_persona` 的 `depends_on` 为 `[product_research, market_analysis, audience_search]`
- **WHEN** 运行该工作流
- **THEN** `generate_persona` SHALL 在三个上游节点全部完成后才执行

#### Scenario: 工作流存在环时执行失败
- **GIVEN** 工作流节点和边构成环
- **WHEN** 系统加载或运行该工作流
- **THEN** 系统 SHALL 返回 HTTP 400
- **AND** 错误信息 SHALL 提示工作流包含循环
