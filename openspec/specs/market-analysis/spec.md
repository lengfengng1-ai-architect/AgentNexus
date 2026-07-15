# Capability: market-analysis

## Purpose

Provide market research analysis for the AllyGo marketing plan pipeline.
The system SHALL accept a brand name and product category, then conduct a
7-dimension market analysis (define→size→trends→users→competitors→assess→synthesize) via web search and LLM synthesis.

## Requirements

### Requirement: Market analysis sync endpoint
The system SHALL expose a `POST /api/v1/market-analysis` endpoint that
synchronously returns a structured market analysis report.

#### Scenario: Valid request returns full report
- **GIVEN** the market analysis agent is initialized
- **WHEN** a client sends a `POST` request to `/api/v1/market-analysis`
  with `{"brand_name": "AllyGo", "category": "运动饮料"}`
- **THEN** the system SHALL respond with HTTP status `200`
- **AND** the response body SHALL contain `report` with `industry_trends`,
  `trend_signals`, `consumer_insights`, `competitive_landscape`, and `full_report`
- **AND** the response body SHALL contain `confidence` (`"high"`, `"medium"`, or `"low"`)

#### Scenario: Missing brand_name returns 422
- **WHEN** a client sends a `POST` request without `brand_name` or with empty string
- **THEN** the system SHALL respond with HTTP status `422`

#### Scenario: Missing category returns 422
- **WHEN** a client sends a `POST` request without `category` or with empty string
- **THEN** the system SHALL respond with HTTP status `422`

#### Scenario: Agent failure returns 500
- **WHEN** the market analysis agent raises an internal exception
- **THEN** the system SHALL respond with HTTP status `500`
- **AND** the response body SHALL contain `detail` with error description

### Requirement: Market analysis SSE stream endpoint
The system SHALL expose a `POST /api/v1/market-analysis/stream` endpoint that returns analysis progress and results as Server-Sent Events, including real-time tool call status and search results.

#### Scenario: Stream delivers tool call and search result events
- **GIVEN** the market analysis agent is initialized
- **WHEN** a client sends a `POST` request to `/api/v1/market-analysis/stream`
- **THEN** the response SHALL be `text/event-stream`
- **AND** the stream SHALL emit `progress` events with `stage` for each dimension (`市场边界定义`, `市场规模估算`, `趋势信号扫描`, `用户画像分析`, `竞争格局梳理`, `机会综合评估`, `报告合成`)
- **AND** the stream SHALL emit `tool_call_start` / `search_result` / `tool_call_end` events for each web_search tool invocation within each node
- **AND** the stream SHALL emit `content_delta` events during LLM generation for each node
- **AND** the stream SHALL emit a final `result` event containing the complete `MarketResearchResponse`
- **AND** the response headers SHALL include `Cache-Control: no-cache`, `Connection: keep-alive`, and `X-Accel-Buffering: no`

#### Scenario: Stream delivers progress and result events
- **GIVEN** the market analysis agent is initialized
- **WHEN** a client sends a `POST` request to `/api/v1/market-analysis/stream`
- **THEN** the response SHALL be `text/event-stream`
- **AND** the stream SHALL emit `progress` events with `stage` for each dimension
- **AND** the stream SHALL emit a final `result` event containing `report` and `confidence`
- **AND** the response headers SHALL include `Cache-Control: no-cache`,
  `Connection: keep-alive`, and `X-Accel-Buffering: no`

### Requirement: 工具调用状态实时推送

系统 SHALL 在市场分析过程中，通过 SSE 实时推送 web_search 工具调用的起止状态，使用 `tool_call_start` / `tool_call_end` 事件。

#### Scenario: 正常推送工具调用开始
- **WHEN** market analysis agent 的某个节点开始调用 web_search 工具
- **THEN** SSE 推送 `tool_call_start` 事件，包含 `tool`（固定为 "web_search"）、`query`（搜索关键词）、`search_id`（本轮搜索唯一标识）

#### Scenario: 正常推送工具调用结束
- **WHEN** market analysis agent 的某个节点完成一次 web_search 调用
- **THEN** SSE 推送 `tool_call_end` 事件，包含 `tool`、`query`、`search_id`、`result_count`（返回结果数）

### Requirement: 搜索结果实时推送

系统 SHALL 在 web_search 返回结果时，逐条通过 SSE `search_result` 事件推送，前端实时展示来源卡片。

#### Scenario: 正常推送搜索结果
- **WHEN** web_search 返回一条搜索结果
- **THEN** SSE 推送 `search_result` 事件，包含 `search_id`（对应工具调用的 search_id）、`title`、`url`、`snippet`
- **AND** 前端在 MarketResearchProgressCard 的搜索来源区域追加一条来源卡片
- **AND** 来源卡片带 slideIn 动画，容器自动滚动到底部

#### Scenario: 搜索无结果
- **WHEN** web_search 返回空结果或网络失败
- **THEN** 不推送 `search_result` 事件
- **AND** 仍然推送 `tool_call_end` 事件（`result_count=0`）

### Requirement: 分析内容逐段推送

系统 SHALL 在 LLM 生成分析内容时，通过 SSE `content_delta` 事件将内容逐段推送，前端实时渲染。

#### Scenario: 正常推送生成内容
- **WHEN** 节点 LLM 完成一段内容生成
- **THEN** SSE 推送 `content_delta` 事件，包含 `node`（节点名称）、`text`（按 `\n\n` 拆分的段落文本）
- **AND** 前端 `updateMessageContent` 累积追加

### Requirement: Market analysis supports mock mode
The system SHALL support a mock mode (via `USE_MOCK_DATA=true` env var)
that returns canned data without calling the LLM agent.

#### Scenario: Mock mode returns mock progress and response
- **GIVEN** `USE_MOCK_DATA=true` is set
- **WHEN** a client sends a request to either endpoint
- **THEN** the response SHALL use data from `backend/mock_data/market.json`
- **AND** the stream endpoint SHALL emit simulated progress events before the result

### Requirement: Market analysis Agent
The system SHALL implement a LangGraph agent that performs the 7-dimension
analysis (define→size→trends→users→competitors→assess→synthesize) using
real web search and LLM integration.

#### Scenario: Agent searches web per node and synthesizes
- **GIVEN** a market name and category
- **WHEN** the agent is invoked
- **THEN** the agent SHALL generate 2-3 search keywords per node
- **AND** the agent SHALL call `searxng_search` for each keyword
- **AND** search results SHALL be injected into the LLM prompt as `search_context`
- **AND** the agent SHALL synthesize findings into a structured `MarketResearchResponse`
- **AND** each finding SHALL include a source URL (or `"LLM 推理"` for inferred content)
- **AND** search results SHALL be pushed to SSE events in real-time

#### Scenario: Search failure does not block analysis
- **WHEN** a web_search call fails (network error, timeout, empty result)
- **THEN** the node SHALL still proceed with LLM generation based on available context
- **AND** the failure SHALL be recorded via `log` event

### Requirement: 7 analysis dimensions
The market analysis SHALL cover exactly 7 dimensions:

- **Market Definition**: Define market scope and boundaries
- **Market Size**: TAM/SAM/SOM estimation with CAGR
- **Trend Signals**: Policy direction signals with assessment (`positive`/`neutral`/`negative`) and sources
- **Target Users**: User segmentation with profiles, scenarios, and pain points
- **Competitive Landscape**: Competing brands with product highlights, pricing, and sources (at least 2-3 brands)
- **Opportunity Assessment**: Market attractiveness, competition intensity, entry difficulty, risks, and recommendations
- **Report Synthesis**: Full markdown report combining all dimensions

### Requirement: 搜索来源实时展示

ChatBubble 在市场分析进行时，SHALL 实时展示搜索来源 URL 列表，包含通过 SSE `search_result` 事件推送的实时来源和通过 `data` 事件 evidence 提取的后处理来源。

#### Scenario: 实时搜索来源展示
- **WHEN** SSE `search_result` 事件到达
- **THEN** 立即追加来源卡片到 MarketResearchProgressCard 的搜索来源区域
- **AND** 来源卡片触发 slideIn 动画
- **AND** 搜索来源区域自动滚动到底部

#### Scenario: 后处理来源补充展示
- **WHEN** ChatContainer 收到 SSE `data` 事件，其中包含 `EvidenceItem[]`
- **THEN** 提取每条 EvidenceItem 的 `source_url` 和 `source_name`，追加到 ChatMessage 的 `marketResearchSources` 数组中
- **AND** 与 `search_result` 事件已追加的来源去重

#### Scenario: 重复 URL 自动去重
- **WHEN** 同一 `source_url` 通过 `search_result` 和 `data` 事件分别到达
- **THEN** 前端去重，不重复添加

#### Scenario: 搜索来源为空
- **WHEN** 所有搜索均无结果且所有 `data` 事件中均不包含 `EvidenceItem`
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

### Requirement: 移动端样式适配 — MarketResearchProgressCard

移动端 MarketResearchProgressCard 的各窗口高度 SHALL 调整为 `max-h-[30vh]`。

#### Scenario: 移动端窗口高度适配
- **WHEN** `variant` 为 `'mobile'`
- **THEN** 搜索来源窗口和进度日志窗口的 max-height 均为 30vh

### Requirement: 移动端样式适配 — MarketResearchResultCards

移动端 MarketResearchResultCards 及其子卡片组件 SHALL 使用更紧凑的尺寸：padding p-3、space-y-3，MarketSizeCard 三列改为垂直排列。

#### Scenario: 移动端卡片尺寸
- **WHEN** `variant` 为 `'mobile'`
- **THEN** 所有卡片 padding 从 p-4 降为 p-3
- **THEN** 卡片之间间距从 space-y-4 降为 space-y-3

#### Scenario: 移动端市场规模三列改一列
- **WHEN** `variant` 为 `'mobile'`
- **THEN** MarketSizeCard 的 grid 从 grid-cols-3 变为 grid-cols-1（TAM/SAM/SOM 垂直堆叠）
- **THEN** 数字字号保持 text-sm 不变（单行更宽裕）

#### Scenario: 移动端机会评估标签堆叠
- **WHEN** `variant` 为 `'mobile'`
- **THEN** OpportunityCard 的评级标签区域从 flex-wrap 变为 flex-col（垂直堆叠）

### Requirement: 来源 URL 从文本字段提取

系统 SHALL 从节点输出的文本字段中正则提取 `「—— 来源: URL」` 格式的 URL 并填充搜索来源窗口。

##### 后端提取来源
- **WHEN** `assemble_result()` 执行
- **THEN** 遍历各节点的文本输出字段，用正则提取来源 URL
- **THEN** 构建 `EvidenceItem` 列表并赋值给 `result.evidence`

#### Scenario: 前端双重提取
- **WHEN** SSE `data` 事件到达
- **THEN** 前端同样用正则从各文本字段提取来源 URL
- **THEN** 提取结果去重后存入 `marketResearchSources` 并展示在搜索来源窗口

### Requirement: 前端公共 SSE 处理 Hook

前端 SHALL 提供 `useMarketResearchStream` 公共 hook，封装市场分析 SSE 流的 fetch 和事件分发逻辑。

#### Scenario: Hook 处理所有事件类型
- **WHEN** `useMarketResearchStream` 启动市场分析 SSE 流
- **THEN** Hook 内部处理全部 9 种事件类型（tool_call_start/search_result/tool_call_end/content_delta/progress/data/node_end/log/result）
- **AND** 暴露 `startMarketResearch`、`activeIds`、`activeSearches` 给调用方
- **AND** 自动管理 AbortController 的创建与终止

#### Scenario: 消除重复代码
- **WHEN** ChatContainer 和 ScreenChat 使用 `useMarketResearchStream`
- **THEN** 两者各删除约 70 行重复的 SSE 处理代码
- **AND** 新增事件类型只需在 hook 内一处处理

### Requirement: 前端工具调用状态条

前端 SHALL 通过 `ToolCallStatusBar` 组件展示当前正在进行的 web_search 调用。

#### Scenario: 展示搜索状态
- **WHEN** `tool_call_start` 事件到达且 `tool` 为 "web_search"
- **THEN** 显示 `🌐 {query}` 状态条 + spinner 动画
- **WHEN** 对应的 `tool_call_end` 事件到达
- **THEN** 收起该条搜索状态条

#### Scenario: 多搜索并发
- **WHEN** 一个节点内连续发起多轮搜索
- **THEN** ToolCallStatusBar 同时显示多个搜索状态条
- **AND** 每个搜索状态条独立控制显示/隐藏

### Requirement: 完整报告渲染

完整报告落地页 SHALL 调用 `marked.parse()` 将 markdown 渲染为 HTML，而非展示纯文本。

#### Scenario: markdown 渲染
- **WHEN** 市场分析完成展示 MarketResearchResultCards
- **THEN** 完整报告区域使用 `marked.parse()` 渲染 markdown 内容
