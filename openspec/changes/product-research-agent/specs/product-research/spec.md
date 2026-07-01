## ADDED Requirements

### Requirement: 产品基础信息调研
系统 SHALL 接受用户输入的产品名称，通过 Web 搜索获取并提取结构化的产品基础信息，返回含信息来源的 JSON 格式结果。

#### Scenario: 调研成功返回完整产品信息
- **WHEN** 用户输入产品名称（如 "iPhone 16"）
- **THEN** 系统返回包含 product_name, brand, manufacturer, industry, category, subcategory, description, launch_date, status, official_website, available_regions, specifications 的结构化 JSON，每个字段标注信息来源 URL

#### Scenario: 输入不存在的产品名称
- **WHEN** 用户输入一个不存在或无法识别的产品名称
- **THEN** 系统返回空结果及提示信息，status 字段标记为 "unknown"，description 说明未找到相关信息

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
- **THEN** 系统跳过该页面，继续读取其他页面，在 sources 中标记该页面读取失败

#### Scenario: 信息来源追溯
- **WHEN** 系统输出结构化产品信息
- **THEN** 每个字段的 values 中必须包含 source URL，表明该信息的来源页面

### Requirement: 结构化输出格式
系统 SHALL 输出包含 sources 字段的 JSON，其中每个字段可以包含来自不同来源的信息。

#### Scenario: 多来源合并
- **WHEN** 同一字段在不同来源有不同值
- **THEN** 系统将多个值及其各自来源都记录在输出中

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

### Requirement: 能力边界检查
系统 MUST 在 superpowers.yaml 的 `in_scope` 中有对应的 `product-research` 条目。

#### Scenario: 检查能力注册
- **WHEN** 系统启动时加载 product-research agent
- **THEN** superpowers.yaml 的 in_scope 列表中包含 `product-research`

### Requirement: API 端点
系统 SHALL 提供 REST API 端点用于触发产品调研。

#### Scenario: 成功请求
- **WHEN** 用户 POST `/api/v1/product-info` 携带 `{"product_name": "iPhone 16"}`
- **THEN** 返回 200，body 包含调研结果 ProductInfoResponse

#### Scenario: 缺少产品名称
- **WHEN** 用户 POST `/api/v1/product-info` 携带空 `product_name`
- **THEN** 返回 422，返回 APIError（code: VALIDATION_ERROR）
