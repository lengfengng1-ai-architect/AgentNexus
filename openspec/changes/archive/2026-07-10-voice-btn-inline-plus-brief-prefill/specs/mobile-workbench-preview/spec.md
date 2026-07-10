## ADDED Requirements

### Requirement: ScreenBrief SHALL 支持从外部输入文本预填表单字段

ScreenBrief SHALL 接收可选的 `initialInput` prop，挂载时按正则解析文本并预填表单字段。

#### Scenario: 命中方案模板格式时提取字段
- **GIVEN** `initialInput` = "我是娃哈哈，属于蓝莓饮品，想在北京深圳做活动，预算100万，周期3个月"
- **WHEN** ScreenBrief 挂载
- **THEN** 品牌字段预填"娃哈哈"
- **AND** 产品线字段预填"蓝莓饮品"
- **AND** 首批城市 chips 北京、深圳自动选中
- **AND** 营销目标字段预填"认知度 ≥80% · 预算 100万"
- **AND** 投放周期字段预填"3个月"

#### Scenario: 非模板格式时填入核心策略
- **GIVEN** `initialInput` = "帮我们做一个蓝莓饮品夏天的校园推广方案"
- **WHEN** ScreenBrief 挂载
- **THEN** 核心策略字段预填"帮我们做一个蓝莓饮品夏天的校园推广方案"
- **AND** 其他字段使用默认 mock 数据

#### Scenario: initialInput 为空时使用默认数据
- **WHEN** ScreenBrief 挂载且 `initialInput` 为 undefined 或空字符串
- **THEN** 所有表单字段使用默认 mock 数据
