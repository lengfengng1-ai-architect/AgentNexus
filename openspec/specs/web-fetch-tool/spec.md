# web-fetch-tool Specification

## Purpose
提供统一的网页抓取能力，将 httpx 并发请求 + HTML 提取逻辑封装为 LangChain BaseTool，供所有 agent 调用。输入 URL，返回纯文本页面内容。

## Requirements

### Requirement: 网页抓取工具
系统 SHALL 提供 web_fetch tool，封装 HTTP 请求 + HTML 提取 + 截断逻辑。

#### Scenario: 正常抓取返回页面文本
- **WHEN** agent 调用 web_fetch tool，传入有效 URL
- **THEN** 工具返回该 URL 的纯文本内容（脱 HTML，最多 4000 字符）

#### Scenario: 非 HTML 内容
- **WHEN** 目标 URL 返回非 HTML 内容（如 PDF、图片）
- **THEN** 工具跳过该页面，返回空内容提示

#### Scenario: 网络错误
- **WHEN** 目标 URL 请求超时或 HTTP 错误
- **THEN** 工具返回错误提示，不抛出异常

#### Scenario: 已有抓取过的 URL 去重
- **WHEN** agent 多次调用 web_fetch 传入相同的 URL
- **THEN** 每次独立抓取（不缓存），由 agent 自行控制重复

### Requirement: Tool Schema 定义
web_fetch tool SHALL 定义清晰的 Pydantic 输入 schema。

#### Scenario: 工具输入参数
- **WHEN** agent 调用 web_fetch
- **THEN** 工具接收 url（str，必填，要抓取的页面 URL）一个参数
