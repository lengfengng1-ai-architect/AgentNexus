# product-research Specification

## Purpose
接受用户输入的产品名称，通过 Web 搜索获取并提取结构化的产品信息，输出按 identity / official_description / features / specifications / availability 五大模块组织，每个字段标注 method（quoted=原文摘录 / extracted=AI综合提取）和 sources 实现可追溯。

## Requirements

### Requirement: 产品基础信息调研
系统 SHALL 接受用户输入的产品名称，通过 Web 搜索获取并提取结构化的产品基础信息，返回按五大模块组织的 JSON 结果。

#### Scenario: 调研成功返回完整产品信息
- **WHEN** 用户输入产品名称（如 "iPhone 16"）
- **THEN** 系统返回按 identity / official_description / features / specifications / availability 五大模块组织的结构化 JSON，每个字段标注 sources URL 和 method（quoted=原文摘录 / extracted=AI综合提取）

#### Scenario: 输入不存在的产品名称
- **WHEN** 用户输入一个不存在或无法识别的产品名称
- **THEN** 系统返回空结果，availability.status 标记为 "unknown"

#### Scenario: 空输入
- **WHEN** 用户输入空字符串或仅含空格的字符串
- **THEN** 系统返回 422 错误，提示产品名称不能为空

### Requirement: Web 搜索与信息提取
系统 SHALL 使用策略二（搜索 + 深度读页）：先搜索获取相关页面列表，再逐个读取页面完整内容，然后基于原文提取结构化信息。

#### Scenario: 搜索并读取多个页面
- **WHEN** 系统收到产品名称
- **THEN** 系统先执行 WebSearch 获取搜索结果，筛选出 3-5 个高质量页面（官网、百科、权威评测等），然后使用 WebFetch 逐个读取页面完整内容

#### Scenario: 页面读取失败
- **WHEN** WebFetch 读取某个页面时网络失败或超时
- **THEN** 系统跳过该页面，继续读取其他页面

#### Scenario: 信息来源追溯
- **WHEN** 系统输出结构化产品信息
- **THEN** 每个字段标注 sources URL，表明该信息的来源页面

### Requirement: 信息来源追溯
系统 SHALL 在每个字段标注 method 和 sources，确保信息可验证可溯源。

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
- **THEN** 每个功能输出 name + description + evidence，evidence 仅含该功能实际出现的页面 URL

#### Scenario: 无可识别功能
- **WHEN** 页面没有明确的功能点列表
- **THEN** features 返回空列表

### Requirement: 结果持久化
系统 SHALL 将调研结果保存为 JSON 文件到 `mock_data/product_info/` 目录。

#### Scenario: 保存调研结果
- **WHEN** 调研完成且返回有效结果
- **THEN** 系统将结果 JSON 保存到 `mock_data/product_info/{product_name_sanitized}.json`

#### Scenario: 同名文件已存在（缓存命中）
- **WHEN** 用户调研一个之前已经调研过的产品
- **THEN** 系统直接读取已存在的 JSON 文件返回，不重复执行搜索和提取流程

#### Scenario: 同名文件不存在（缓存未命中）
- **WHEN** 用户调研一个新产品
- **THEN** 系统完整执行搜索→读页→提取流程，保存 JSON 后返回

### Requirement: availability 模块
系统 SHALL 提取产品可获得性信息：status, pricing, regions, access_model。

#### Scenario: 提取价格信息
- **WHEN** 页面包含结构化价格信息
- **THEN** pricing 数组包含 label + price + currency + source

#### Scenario: 提取销售地区
- **WHEN** 页面列出销售或服务地区
- **THEN** available_regions 输出地区列表，标注来源

### Requirement: API 端点
系统 SHALL 提供 REST API 端点用于触发产品调研。

#### Scenario: 成功请求
- **WHEN** 用户 POST `/api/v1/product-info` 携带 `{"product_name": "iPhone 16"}`
- **THEN** 返回 200，body 包含调研结果 ProductInfoResponse

#### Scenario: 缺少产品名称
- **WHEN** 用户 POST `/api/v1/product-info` 携带空 `product_name`
- **THEN** 返回 422，返回 APIError（code: VALIDATION_ERROR）
