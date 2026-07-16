## ADDED Requirements

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

## MODIFIED Requirements

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
- **AND** the response headers SHALL include `Cache-Control: no-cache`, `Connection: keep-alive`, and `X-Accel-Buffering: no`

### Requirement: Market analysis Agent

The system SHALL implement a LangGraph agent that performs the 7-dimension analysis (define→size→trends→users→competitors→assess→synthesize) using real web search and LLM integration.

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

## REMOVED Requirements

### Requirement: 来源 URL 从文本字段提取

**Reason**: 本 change 将搜索来源的主要路径从"LLM 文本正则提取"升级为"真实 web_search + SSE search_result 事件实时推送"。文本正则提取作为后处理补充保留在 `assemble_result()` 中，但不再作为前端搜索来源的唯一或主要来源。

**Migration**: 前端优先使用 `search_result` 事件构建来源列表；`data` 事件中的 evidence 作为补充来源。后端的 `assemble_result()` 中的正则提取逻辑保留，作为 `MarketResearchResult.evidence` 的来源。
