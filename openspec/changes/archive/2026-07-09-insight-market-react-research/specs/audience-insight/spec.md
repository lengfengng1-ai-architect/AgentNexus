## ADDED Requirements

### Requirement: Tool Calling 能力

audience_insight agent SHALL 具备通过 tool calling 自主补充搜索信息的能力，在批量搜索抓取之后、提取人群数据之前，LLM 可根据已有信息量决定是否需要补充搜索。

#### Scenario: 调用 web_search tool
- **WHEN** LLM 判断需要补充额外人群信息（如某年龄段数据不足）
- **THEN** LLM 调用 web_search tool 搜索新关键词，将结果注入对话上下文

#### Scenario: 调用 web_fetch tool
- **WHEN** LLM 搜索到新 URL 需要查看内容
- **THEN** LLM 调用 web_fetch tool 读取页面内容，提取的信息参与后续人群提取

#### Scenario: 最大 Tool Calling 轮次
- **WHEN** LLM 连续调用 tool 超过 3 轮
- **THEN** 系统强制进入最终人群数据提取，使用已有数据

#### Scenario: 信息充足无需补充
- **WHEN** 批量数据已就绪，LLM 认为人群信息足够
- **THEN** LLM 不调 tool，直接进入人群数据提取
