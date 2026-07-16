## ADDED Requirements

### Requirement: 来源 URL 从文本字段提取

系统 SHALL 从节点输出的文本字段中正则提取 `「—— 来源: URL」` 格式的 URL 并填充搜索来源窗口。

#### Scenario: 后端提取来源
- **WHEN** `assemble_result()` 执行
- **THEN** 遍历各节点的文本输出字段，用正则提取来源 URL
- **THEN** 构建 `EvidenceItem` 列表并赋值给 `result.evidence`

#### Scenario: 前端双重提取
- **WHEN** SSE `data` 事件到达
- **THEN** 前端同样用正则从各文本字段提取来源 URL
- **THEN** 提取结果去重后存入 `marketResearchSources` 并展示在搜索来源窗口

### Requirement: 完整报告渲染

完整报告落地页 SHALL 调用 `marked.parse()` 将 markdown 渲染为 HTML，而非展示纯文本。

#### Scenario: markdown 渲染
- **WHEN** 市场分析完成展示 MarketResearchResultCards
- **THEN** 完整报告区域使用 `marked.parse()` 渲染 markdown 内容
