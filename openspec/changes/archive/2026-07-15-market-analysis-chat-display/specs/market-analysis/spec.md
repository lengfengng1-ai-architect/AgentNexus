## ADDED Requirements

### Requirement: 搜索来源实时展示

ChatBubble 在市场分析进行时，SHALL 实时展示搜索来源 URL 列表，每条包含来源名称和完整 URL。

#### Scenario: 正常展示搜索来源
- **WHEN** ChatContainer 收到 SSE `data` 事件，其中包含 `EvidenceItem[]`
- **THEN** 提取每条 EvidenceItem 的 `source_url` 和 `source_name`，追加到 ChatMessage 的 `marketResearchSources` 数组中
- **THEN** 搜索来源小窗口自动滚动到底部

#### Scenario: 重复 URL 自动去重
- **WHEN** 同一 `source_url` 在多个 `data` 事件中出现
- **THEN** 前端去重，不重复添加

#### Scenario: 搜索来源为空
- **WHEN** 所有 `data` 事件中均不包含 `EvidenceItem` 或所有 `source_url` 为空
- **THEN** 搜索来源窗口显示"暂无搜索来源数据"提示

### Requirement: 分析进度实时展示

ChatBubble 在市场分析进行时，SHALL 实时展示分析进度日志，每条日志按时间顺序排列，自动滚动到底部。

#### Scenario: 正常展示进度日志
- **WHEN** ChatContainer 收到 SSE `progress` 事件
- **THEN** 在进度日志窗口追加该阶段名称
- **WHEN** ChatContainer 收到 SSE `log` 事件
- **THEN** 在进度日志窗口追加该日志消息

#### Scenario: 日志窗口自动滚动
- **WHEN** 新的进度或日志消息追加
- **THEN** 进度日志窗口自动平滑滚动到底部，确保最新消息可见

#### Scenario: 日志截断
- **WHEN** 进度日志条数超过 50 条
- **THEN** 截断保留最近 50 条

### Requirement: 搜索来源 + 进度双窗口布局

市场分析流式进行期间，SHALL 同时展示搜索来源和进度日志两个嵌入式小窗口，上下排列。

#### Scenario: 双窗口布局
- **WHEN** 市场分析正在进行
- **THEN** 上方显示搜索来源窗口，下方显示进度日志窗口
- **THEN** 两个窗口均有 max-height 限制，内容超出时显示滚动条
- **THEN** 新增内容时各窗口独立 auto-scroll 到底部

### Requirement: 结构化结果卡片集合

市场分析流完成后，SHALL 将小窗口替换为结构化卡片集合，展示完整的分析结果。

#### Scenario: 流完成切换
- **WHEN** ChatContainer 收到 SSE `result` 事件
- **THEN** 隐藏搜索来源和进度小窗口
- **THEN** 显示结构化卡片集合（不可滚动，信息完整展现）

#### Scenario: 卡片集合内容
- **WHEN** 结构化卡片集合展示
- **THEN** 展示市场摘要卡（名称/行业/地理/周期）
- **THEN** 展示市场规模卡（TAM/SAM/SOM/CAGR）
- **THEN** 展示趋势信号卡
- **THEN** 展示目标用户卡
- **THEN** 展示竞争格局卡
- **THEN** 展示机会评估卡
- **THEN** 展示证据来源列表（可折叠）

#### Scenario: 分析失败场景
- **WHEN** SSE 流报告错误或连接中断
- **THEN** 搜索来源和进度日志保留最后一次状态
- **THEN** 显示错误提示信息
- **THEN** 不展示结构化卡片

### Requirement: 组件错误与空状态

所有市场分析展示组件 SHALL 处理加载、空数据和错误状态。

#### Scenario: 空数据状态
- **WHEN** 搜索来源列表为空
- **THEN** 显示"暂无来源数据"占位提示

#### Scenario: 加载状态
- **WHEN** 市场分析启动但尚未收到 SSE 事件
- **THEN** 搜索来源窗口显示"正在搜索…"
- **THEN** 进度日志窗口显示"正在启动分析…"
