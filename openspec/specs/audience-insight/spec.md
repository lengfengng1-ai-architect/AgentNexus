# audience-insight Specification

## Purpose
TBD - created by archiving change audience-insight-agent. Update Purpose after archive.
## Requirements
### Requirement: 人群信息调研
系统 SHALL 接受产品名称，通过 Web 搜索获取目标人群的原始数据（人口统计、购买行为、使用场景、用户特征描述等），每个字段标注来源 URL。

#### Scenario: 成功提取人群数据
- **WHEN** 系统输入产品名称（如 "iPhone 16"）
- **THEN** 系统返回包含 demographics、purchase_behavior、usage_scenarios、descriptions 的结构化 JSON，保存到 mock_data/audience_insight/ 目录

#### Scenario: 未找到人群信息
- **WHEN** 系统搜索后无法找到目标人群数据
- **THEN** 各字段留空/null，descriptions 返回空数组

### Requirement: 用户画像生成
系统 SHALL 综合产品调研结果、市场调研结果和自身上网调研的人群数据，生成结构化的用户画像，输出偏产品维度（核心用户概述、人口画像、购买动机、产品使用画像、生活方式、产品关联度）。

#### Scenario: 生成完整用户画像
- **WHEN** 系统输入产品名称
- **THEN** 系统输出包含 profile_summary、demographics、purchase_motivation、product_usage、lifestyle、product_fit 的结构化 JSON，保存到 mock_data/user_persona/ 目录

#### Scenario: 画像字段可追溯
- **WHEN** 用户画像是基于人群调研数据综合得出的
- **THEN** method 标注为 "inferred" 并注明数据来源

#### Scenario: 画像有原文引用
- **WHEN** 用户画像是直接从报告/文章原文摘录的
- **THEN** method 标注为 "quoted" 并附带原文引用

### Requirement: Tool Calling 能力（人群洞察补充搜索）
系统 SHALL 在批量搜索抓取之后、提取人群数据之前，支持 LLM 通过 tool calling 自主补充搜索信息。

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

### Requirement: 数据结构分层
系统 SHALL 将人群调研原始数据和用户画像分别存放在 mock_data/audience_insight/ 和 mock_data/user_persona/ 两个目录。

#### Scenario: 存储路径正确
- **WHEN** 人群调研完成
- **THEN** 结果存入 mock_data/audience_insight/{product_name}.json

#### Scenario: 用户画像存储
- **WHEN** 用户画像生成完成
- **THEN** 结果存入 mock_data/user_persona/{product_name}.json

### Requirement: API 端点
系统 SHALL 提供 REST API 端点用于触发人群洞察调研和用户画像生成。

#### Scenario: 人群调研请求
- **WHEN** 用户 POST /api/v1/audience-insight 携带 {"product_name": "iPhone 16"}
- **THEN** 返回 200，body 包含人群调研原始数据和用户画像

#### Scenario: 缺少产品名称
- **WHEN** 用户 POST /api/v1/audience-insight 携带空 product_name
- **THEN** 返回 422，返回 APIError（code: VALIDATION_ERROR）

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

