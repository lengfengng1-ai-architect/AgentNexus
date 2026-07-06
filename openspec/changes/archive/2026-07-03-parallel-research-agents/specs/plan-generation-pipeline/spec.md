## MODIFIED Requirements

### Requirement: 调研阶段三个节点并行执行

系统 SHALL 在方案生成流水线中，将 `product_research`、`market_research`、`audience_search` 三个节点从 START 同时 fan-out 并行执行。

#### Scenario: 三个调研节点并行启动
- **GIVEN** 用户提交品牌输入触发方案生成
- **WHEN** 流水线启动
- **THEN** `product_research`、`market_research`、`audience_search` 三个节点 SHALL 同时开始执行
- **AND** 总耗时 SHALL 约等于最慢的单个节点耗时

#### Scenario: fan-in 汇合后执行用户画像生成
- **GIVEN** 三个调研节点均已完成
- **WHEN** `audience_insight` 节点被触发
- **THEN** 它 SHALL 能访问到三个上游节点的输出（product_research、market_research、audience_search）
- **AND** 基于三者数据综合生成用户画像

#### Scenario: 某个调研节点失败不阻塞其他并行节点
- **GIVEN** `market_research` 节点执行失败
- **WHEN** `product_research` 和 `audience_search` 仍在执行
- **THEN** 它们 SHALL 继续执行直到完成或自身失败

### Requirement: 每个调研节点结果持久化到 mock_data

系统 SHALL 在每个调研节点返回结果后，将结果以 JSON 文件形式保存到对应的 `mock_data/` 子目录。

| 节点 | 保存路径 |
|------|----------|
| product_research | `mock_data/product_info/{product_name}.json` |
| market_research | `mock_data/market_analysis/{market_name}.json` |
| audience_search | `mock_data/audience_insight/{product_name}.json` |
| audience_insight | `mock_data/user_persona/{product_name}.json` |
