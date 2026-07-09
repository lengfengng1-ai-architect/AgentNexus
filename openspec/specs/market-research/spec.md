# market-research Specification

## Purpose
TBD - created by archiving change insight-market-react-research. Update Purpose after archive.
## Requirements
### Requirement: 市场信息搜索

系统 SHALL 接受品牌名称和品类，通过多个关键词的 Web 搜索获取原始市场信息。

#### Scenario: 搜索市场信息
- **WHEN** 系统输入品牌名称（如 "AllyGo"）和品类（如 "运动饮料"）
- **THEN** 系统并行执行 4 个关键词搜索（产业链、市场规模、行业趋势、市场机会），去重后取 top 25 条结果

#### Scenario: 搜索无结果
- **WHEN** 所有关键词搜索均未返回结果
- **THEN** 系统返回空结果，market_summary 标记为 "搜索未返回市场信息"

### Requirement: 页面抓取

系统 SHALL 并发抓取搜索结果中的页面，提取可读文本内容。

#### Scenario: 成功抓取页面
- **WHEN** 系统获得搜索结果的 URL 列表
- **THEN** 系统并发（最大 8 并发）抓取页面，提取 HTML 正文文本（最多 4000 字符）

#### Scenario: 页面读取失败
- **WHEN** web_fetch 读取某个页面时网络失败或超时
- **THEN** 系统跳过该页面，继续读取其他页面

### Requirement: Tool Calling 能力

market_research agent SHALL 具备通过 tool calling 自主补充搜索信息的能力，在批量搜索抓取之后、提取市场数据之前，LLM 可根据已有信息量决定是否需要补充搜索。

#### Scenario: 调用 web_search tool
- **WHEN** LLM 判断需要补充额外市场信息（如某趋势数据不足）
- **THEN** LLM 调用 web_search tool 搜索新关键词，将结果注入对话上下文

#### Scenario: 调用 web_fetch tool
- **WHEN** LLM 搜索到新 URL 需要查看内容
- **THEN** LLM 调用 web_fetch tool 读取页面内容，提取的信息参与后续市场信息提取

#### Scenario: 最大 Tool Calling 轮次
- **WHEN** LLM 连续调用 tool 超过 3 轮
- **THEN** 系统强制进入最终市场信息提取，使用已有数据

#### Scenario: 信息充足无需补充
- **WHEN** 批量数据已就绪，LLM 认为市场信息足够
- **THEN** LLM 不调 tool，直接进入市场信息提取

### Requirement: 市场信息提取

系统 SHALL 从抓取的页面内容中提取结构化市场信息，包括市场定义、市场规模、行业趋势、市场机会。

#### Scenario: 成功提取市场信息
- **WHEN** 系统获取到有效的页面内容
- **THEN** 系统输出包含 market_summary、trends（最多 5 条）、opportunities（最多 5 条）的结构化 JSON

#### Scenario: 无有效页面内容
- **WHEN** 所有抓取的页面均无效（无内容/非 HTML）
- **THEN** 系统返回 market_summary 标记为 "未找到市场信息"，trends 和 opportunities 为空数组

### Requirement: Mock 数据支持

系统 SHALL 支持 mock 模式，在 `USE_MOCK_DATA=true` 时从 `mock_data/market_research/` 读取预设数据。

#### Scenario: Mock 数据存在
- **WHEN** USE_MOCK_DATA=true 且 `mock_data/market_research/{category}.json` 存在
- **THEN** 系统直接读取 mock 数据返回，跳过搜索/抓取/提取流程

#### Scenario: Mock 数据不存在
- **WHEN** USE_MOCK_DATA=true 但对应品类无 mock 数据
- **THEN** 系统返回空结果，market_summary 标记为 "未配置 mock 数据"

