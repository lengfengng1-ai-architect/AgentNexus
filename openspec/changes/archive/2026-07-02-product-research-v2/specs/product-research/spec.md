## MODIFIED Requirements

### Requirement: 产品基础信息调研
系统 SHALL 接受用户输入的产品名称，通过 Web 搜索获取并提取结构化的产品基础信息，返回含可验证溯源的 JSON 格式结果。

输出结构按五大模块组织：
- **identity**: 产品标识信息（product_name, brand, manufacturer, industry, category）
- **official_description**: 官方描述（description, tagline, statement），优先原文摘录
- **features**: 产品功能列表，每个功能独立标注 evidence
- **specifications**: 动态规格参数
- **availability**: 可获得性（status, pricing, regions, access_model）

#### Scenario: 调研成功返回完整产品信息
- **WHEN** 用户输入产品名称（如 "iPhone 16"）
- **THEN** 系统返回按 identity / official_description / features / specifications / availability 五大模块组织的结构化 JSON，每个字段标注 sources URL 和 method（quoted=原文摘录 / extracted=AI综合提取）

#### Scenario: 输入不存在的产品名称
- **WHEN** 用户输入一个不存在或无法识别的产品名称
- **THEN** 系统返回空结果及提示信息，status 标记为 "unknown"

#### Scenario: 空输入
- **WHEN** 用户输入空字符串或仅含空格的字符串
- **THEN** 系统返回 422 错误，提示产品名称不能为空

### Requirement: 信息来源追溯
系统 SHALL 在每个字段标注 method 和 sources，确保信息可验证可溯源。

字段级 requirement：
- **method** 取值 `quoted`（原文摘录）或 `extracted`（AI综合提取）
- **quoted** 模式必须有 **quote** 字段存原文引用片段
- **extracted** 模式必须有 **sources[]** 标注信息来源 URL
- **features[]** 的每个条目必须有独立的 **evidence[]**，与其他功能不共享

#### Scenario: quoted 字段可追溯
- **WHEN** 字段 method 为 "quoted"
- **THEN** 该字段包含 quote 原文片段，value 来自该片段

#### Scenario: extracted 字段有来源
- **WHEN** 字段 method 为 "extracted"
- **THEN** 该字段包含 sources[] 标注信息来源 URL

#### Scenario: 功能独立标注证据
- **WHEN** 系统输出 features[]
- **THEN** 每个 feature 的 evidence[] 仅包含该功能实际出现的页面 URL

### Requirement: identity 模块
系统 SHALL 提取产品标识信息：product_name, brand, manufacturer, industry, category。

#### Scenario: 提取产品名称
- **WHEN** 系统读取到产品名称
- **THEN** product_name 的 value 必须来自官网/包装/文档，method 为 "quoted" 且带原文引用

#### Scenario: 提取品牌和厂商
- **WHEN** 系统读取到品牌和厂商信息
- **THEN** brand 和 manufacturer 的 method 为 "extracted"，标注来源

### Requirement: official_description 模块
系统 SHALL 提取官方描述信息：description, tagline, statement，优先从官网原文摘录。

#### Scenario: 官网有明确描述
- **WHEN** 官网页面有工整的产品描述段落或 slogan
- **THEN** method 为 "quoted"，value 为原文，quote 存原文片段

#### Scenario: 官网无明确描述
- **WHEN** 官网没有工整的产品描述（如仅有图片或视频）
- **THEN** method 为 "extracted"，从其他权威页面提取

### Requirement: features 模块
系统 SHALL 提取产品功能列表，每个功能独立标注来源。

#### Scenario: 提取功能点
- **WHEN** 页面明确列出产品功能
- **THEN** 每个功能输出 name + category + description + evidence，evidence 仅含该功能实际出现的页面 URL

#### Scenario: 无可识别功能
- **WHEN** 页面没有明确的功能点列表
- **THEN** features 返回空列表

### Requirement: availability 模块
系统 SHALL 提取产品可获得性信息：status, pricing, regions, access_model。

#### Scenario: 提取价格信息
- **WHEN** 页面包含结构化价格信息
- **THEN** pricing 数组包含 label + price + currency + source

#### Scenario: 提取销售地区
- **WHEN** 页面列出销售或服务地区
- **THEN** available_regions 输出地区列表，标注来源
