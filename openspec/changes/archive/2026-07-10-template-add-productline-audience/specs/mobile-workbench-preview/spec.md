## MODIFIED Requirements

### Requirement: ScreenBrief SHALL 支持从外部输入文本和 BrandInput 结构化数据预填表单

`ScreenBrief` SHALL 接收可选的 `initialInput`（消息内容文本）和 `initialBrandData`（结构化品牌数据）props，挂载时按以下优先级合并后初始化表单字段：

**优先级：** `initialBrandData` 的具体字段 > `parseBriefInput(initialInput)` 正则提取结果 > mock 默认值

`parseBriefInput` SHALL 支持以下正则提取规则：
- `我是(.+?)[，,]` → `brand_name`
- `属于(.+?)[，,]` → `category`
- `产品线是(.+?)[，,]` → `product_matrix`
- `目标人群(.+?)[，,]` → `target_audience`
- `想在(.+?)做活动` → `selected_cities`
- `预算(\d+)` → `marketing_goal`
- `周期(\d+)个?月` → `period`
