# web-search-tool Specification

## Purpose
提供统一的 Web 搜索能力，将 searxng_search 封装为 LangChain BaseTool，供所有 agent 调用。输入搜索关键词和结果数量，返回格式化的搜索结果列表（标题 + URL + 摘要）。

## Requirements

### Requirement: Web 搜索工具
系统 SHALL 提供 web_search tool，封装 searxng_search 的搜索+去重+过滤逻辑。

#### Scenario: 正常搜索返回结果
- **WHEN** agent 调用 web_search tool，传入查询关键词
- **THEN** 工具返回格式化搜索结果，每条包含标题、URL、摘要文本

#### Scenario: 搜索无结果
- **WHEN** agent 调用 web_search tool 但搜索无结果
- **THEN** 工具返回 "搜索无结果" 提示

#### Scenario: 搜索失败
- **WHEN** searxng_search 调用失败（网络错误等）
- **THEN** 工具返回错误提示，不抛出异常

### Requirement: 搜索结果去重与过滤
web_search tool SHALL 对搜索结果进行 URL 去重和域名过滤。

#### Scenario: 相同 URL 只保留一次
- **WHEN** 多个搜索关键词返回相同的 URL
- **THEN** 结果去重，每个 URL 只出现一次

#### Scenario: 跳过 blocked 域名
- **WHEN** 搜索结果包含 BLOCKED_DOMAINS 中的域名
- **THEN** 结果中排除该条目

### Requirement: Tool Schema 定义
web_search tool SHALL 定义清晰的 Pydantic 输入 schema。

#### Scenario: 工具输入参数
- **WHEN** agent 调用 web_search
- **THEN** 工具接收 query（str，必填，搜索关键词）和 max_results（int，可选，默认 8）两个参数
