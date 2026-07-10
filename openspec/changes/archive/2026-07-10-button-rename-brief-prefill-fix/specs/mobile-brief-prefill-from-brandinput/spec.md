## ADDED Requirements

### Requirement: 从 BrandInput 结构化数据映射简报表单字段

系统 SHALL 将 `BrandInput`（brand_name/category/city/budget/period）映射到简报表单的对应字段。

#### Scenario: brand_name → 品牌字段
- **GIVEN** `initialBrandData.brand_name` = "可口可乐"
- **WHEN** ScreenBrief 挂载
- **THEN** 品牌 input 的 value SHALL 为"可口可乐"

#### Scenario: category → 产品线字段
- **GIVEN** `initialBrandData.category` = "运动饮料"
- **WHEN** ScreenBrief 挂载
- **THEN** 产品线 input 的 value SHALL 为"运动饮料"

#### Scenario: city → 匹配城市 chips
- **GIVEN** `initialBrandData.city` = "北京,成都"
- **WHEN** ScreenBrief 挂载
- **THEN** 首批城市 chips 中「北京」「成都」SHALL 选中
- **AND** 其他城市 chips SHALL 不选中

#### Scenario: budget → 营销目标字段
- **GIVEN** `initialBrandData.budget` = 500
- **WHEN** ScreenBrief 挂载
- **THEN** 营销目标 input 的 value SHALL 为"认知度 ≥80% · 预算 500万"

#### Scenario: period → 投放周期字段
- **GIVEN** `initialBrandData.period` = 6
- **WHEN** ScreenBrief 挂载
- **THEN** 投放周期 select 的 value SHALL 为"6 个月（24 周）"
