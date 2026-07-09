# product-research Specification (Delta)

> 基于 openspec/specs/product-research/spec.md，本次 change 修改内部架构但不改外部行为和输出。

## MODIFIED Requirements

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

### Requirement: Web 搜索与信息提取（修改）
系统 SHALL 使用 Hybrid 搜索策略：先批量并行搜索+抓取获取初始页面，再由 LLM 通过 tool calling 自主决定是否需要更多信息。

#### Scenario: 批量搜索并读取页面
- **WHEN** 系统收到产品名称
- **THEN** 系统先并行执行 3 个关键词的 Web 搜索，筛选出 top 25 个高质量页面，然后并发抓取页面完整内容

#### Scenario: LLM 自主查漏补缺
- **WHEN** 批量数据已就绪，但 LLM 认为信息不足（如缺少官网、价格）
- **THEN** LLM 可调用 web_search / web_fetch tool 补充搜索和抓取，最多 3 轮

#### Scenario: LLM 认为信息充足
- **WHEN** 批量数据已就绪，LLM 认为信息足够
- **THEN** LLM 不调 tool，直接进入结构化输出

#### Scenario: 页面读取失败
- **WHEN** web_fetch 读取某个页面时网络失败或超时
- **THEN** 系统跳过该页面，继续读取其他页面

#### Scenario: 信息来源追溯
- **WHEN** 系统输出结构化产品信息
- **THEN** 每个字段标注 sources URL，表明该信息的来源页面

## ADDED Requirements

### Requirement: Tool Calling 能力
product_research agent SHALL 具备通过 tool calling 自主补充搜索信息的能力。

#### Scenario: 调用 web_search tool
- **WHEN** LLM 判断需要补充额外信息
- **THEN** LLM 调用 web_search tool 搜索新关键词，将结果注入对话上下文

#### Scenario: 调用 web_fetch tool
- **WHEN** LLM 搜索到新 URL 需要查看内容
- **THEN** LLM 调用 web_fetch tool 读取页面内容

#### Scenario: 最大 Tool Calling 轮次
- **WHEN** LLM 连续调用 tool 超过 3 轮
- **THEN** 系统强制进入最终结构化输出，使用已有数据
