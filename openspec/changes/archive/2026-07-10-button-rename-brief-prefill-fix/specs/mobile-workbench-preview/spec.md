## ADDED Requirements

### Requirement: ScreenBrief SHALL 支持从 BrandInput 结构化数据预填表单

ScreenBrief SHALL 接收可选的 `initialBrandData` prop，与 `initialInput`（输入框文本 parse）合并使用，BrandInput 结构化字段优先级最高。

#### Scenario: BrandInput 覆盖输入框 parse 的对应字段
- **GIVEN** `initialInput` = "我是娃哈哈，属于饮品，想在北京上海做活动"
- **AND** `initialBrandData` = `{ brand_name: "可口可乐", city: "深圳", budget: 200, period: 6 }`
- **WHEN** ScreenBrief 挂载
- **THEN** 品牌字段 SHALL 为"可口可乐"（BrandInput 覆盖 parse 结果）
- **AND** 产品线字段 SHALL 为"饮品"（parse 提取，BrandInput 无对应字段）
- **AND** 首批城市 chips SHALL 选"深圳"（BrandInput 覆盖）
- **AND** 营销目标 SHALL 为"认知度 ≥80% · 预算 200万"（BrandInput budget 覆盖）
- **AND** 投放周期 SHALL 为"6 个月（24 周）"（BrandInput period 覆盖）

#### Scenario: BrandInput 各字段为 null 时退化到 parse 逻辑
- **GIVEN** `initialInput` = "我是娃哈哈，属于饮品，想在北京上海做活动"
- **AND** `initialBrandData` = `{ brand_name: "娃哈哈", category: null, city: null, budget: null, period: null }`
- **WHEN** ScreenBrief 挂载
- **THEN** 品牌字段 SHALL 为"娃哈哈"
- **AND** 产品线 SHALL 为"饮品"
- **AND** 营销目标 SHALL 包含 parse 提取的预算信息或使用默认值

#### Scenario: 两者皆为空时使用默认 mock 数据
- **WHEN** `initialInput` 和 `initialBrandData` 都为 undefined
- **THEN** 所有字段 SHALL 使用默认 mock 数据
