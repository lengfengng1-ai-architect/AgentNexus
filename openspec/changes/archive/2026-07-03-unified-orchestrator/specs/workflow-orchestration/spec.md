## ADDED Requirements

### Requirement: Agent 返回结果自动持久化到 mock_data
系统 SHALL 在 registry handler 返回结果前将结果持久化到对应的 mock_data 目录，无论通过 API 还是 workflow 调用。

#### Scenario: workflow 调产品调研后文件存在
- **GIVEN** 通过 workflow 调用 `product_research` 节点
- **WHEN** 节点执行完成
- **THEN** 结果 SHALL 保存在 `mock_data/product_info/{product_name}.json`

#### Scenario: workflow 调人群搜索后文件存在
- **GIVEN** 通过 workflow 调用 `audience_search` 节点
- **WHEN** 节点执行完成
- **THEN** 结果 SHALL 保存在 `mock_data/audience_insight/{product_name}.json`

#### Scenario: workflow 调市场分析后文件存在
- **GIVEN** 通过 workflow 调用 `generate_persona` 节点
- **WHEN** 节点执行完成
- **THEN** 结果 SHALL 保存在 `mock_data/user_persona/{product_name}.json`

## MODIFIED Requirements

### Requirement: 工作流可以按拓扑顺序串行或并行执行
系统 SHALL 通过 `orchestrator.build_graph()` 编译执行所有 workflow（现有 `_execute_nodes` 手动调度被移除）。

#### Scenario: 并行节点并发执行
- **GIVEN** 工作流有多个无依赖节点
- **WHEN** 运行该工作流
- **THEN** 这些节点 SHALL 并发执行

#### Scenario: 串行节点顺序执行
- **GIVEN** 工作流节点通过 `depends_on` 声明依赖
- **WHEN** 运行该工作流
- **THEN** 节点 SHALL 按依赖顺序执行

#### Scenario: 工作流存在环时执行失败
- **GIVEN** 工作流节点依赖构成环
- **WHEN** 系统加载或运行该工作流
- **THEN** 系统 SHALL 返回 HTTP 400
- **AND** 错误信息 SHALL 提示工作流包含循环
