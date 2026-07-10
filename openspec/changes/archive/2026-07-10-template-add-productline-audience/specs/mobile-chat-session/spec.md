## MODIFIED Requirements

### Requirement: 快捷按钮行提供可横向滚动的工具栏入口

系统 SHALL 在输入框上方提供可横向滚动的快捷按钮工具栏，当前按钮为「附件上传」「方案模版」「产品海报」「产品视频」「方案生成」，后续可继续增加。

#### Scenario: 工具栏按钮渲染和排序
- **WHEN** ① 对话屏渲染
- **THEN** 输入框上方 SHALL 显示一行可横向滚动的快捷按钮
- **AND** 按钮行 SHALL 可横向滚动（`overflow-x: auto`）

### Requirement: "方案模版"按钮填入完整模板到输入框

点击"方案模版"时，SHALL 将包含所有字段的模板填入输入框，模板包含品牌、品类、产品线、目标人群、城市、预算、周期等占位参数。

#### Scenario: 点击方案模版填入完整模板
- **WHEN** 用户点击"方案模版"按钮
- **THEN** 输入框 SHALL 填入：`我是 [品牌名]，属于 [品类]，产品线是 [产品线]，目标人群 [目标人群]，想在 [城市] 做活动，预算 [金额] 万，周期 [时长] 个月`

## ADDED Requirements

### Requirement: parseBriefInput SHALL 解析产品线和目标人群

`parseBriefInput` 函数 SHALL 从模板文本中提取「产品线」和「目标人群」字段，分别映射到 `product_matrix` 和 `target_audience`。

#### Scenario: 从完整模板中提取产品线
- **GIVEN** `initialInput` = "我是可口可乐，属于饮品，产品线是零糖系列，目标人群 25-35岁白领，想在深圳做活动..."
- **WHEN** parseBriefInput 执行
- **THEN** `product_matrix` SHALL 为"零糖系列"
- **AND** `target_audience` SHALL 为"25-35岁白领"
