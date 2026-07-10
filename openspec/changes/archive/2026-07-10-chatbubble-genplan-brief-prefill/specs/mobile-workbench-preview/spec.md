## ADDED Requirements

### Requirement: ScreenBrief SHALL 支持从外部输入文本和 BrandInput 结构化数据预填表单

`ScreenBrief` SHALL 接收可选的 `initialInput`（消息内容文本）和 `initialBrandData`（结构化品牌数据）props，挂载时按以下优先级合并后初始化表单字段：

**优先级：** `initialBrandData` 的具体字段 > `parseBriefInput(initialInput)` 正则提取结果 > mock 默认值

#### Scenario: BrandInput 数据预填对应表单字段
- **GIVEN** `initialBrandData` = `{ brand_name: "可口可乐", category: "饮品", city: "深圳", budget: 200, period: 6 }`
- **AND** `initialInput` = "我是可口可乐，属于饮品，想在深圳做活动"
- **WHEN** ScreenBrief 挂载
- **THEN** 品牌字段 SHALL 为"可口可乐"
- **AND** 品类字段 SHALL 为"饮品"
- **AND** 首批城市 chips SHALL 选"深圳"
- **AND** 营销目标 SHALL 为"认知度 ≥80% · 预算 200万"
- **AND** 投放周期 SHALL 为"6 个月（24 周）"

#### Scenario: 无 props 时使用默认 mock 数据
- **WHEN** `initialInput` 和 `initialBrandData` 都为 undefined
- **THEN** 所有表单字段 SHALL 使用默认 mock 数据
