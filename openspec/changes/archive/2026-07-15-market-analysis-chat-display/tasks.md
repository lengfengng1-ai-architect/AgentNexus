## 1. 类型系统扩展

- [x] 1.1 ChatMessage 新增 `marketResearchSources: { url: string; title: string }[]` 字段
- [x] 1.2 ChatMessage 新增 `marketResearchProgressLogs: string[]` 字段
- [x] 1.3 useChat reducer 新增 `UPDATE_MARKET_RESEARCH_SOURCES` action（追加去重后的来源 URL）
- [x] 1.4 useChat reducer 新增 `APPEND_MARKET_RESEARCH_LOG` action（追加进度日志）
- [x] 1.5 useChat 暴露 `appendMarketResearchSources`、`appendMarketResearchLog` 和 `setMarketResearchResult` dispatch 方法

## 2. SSE 数据事件消费

- [x] 2.1 ChatContainer 的 SSE 循环增加 `event: data` 处理分支，解析 `MarketResearchDataEvent`
- [x] 2.2 从 `data.result` 中提取 `evidence[]` 数组，取 `source_url + source_name` 去重后存入 state
- [x] 2.3 从 `data.result` 中提取各节点结构化数据，通过 `setMarketResearchResult` 累保存待 `result` 事件到来后使用
- [x] 2.4 ChatContainer 的 `log` 事件处理改为通过 `appendMarketResearchLog` dispatch

## 3. 搜索来源组件 MarketResearchProgressCard

- [x] 3.1 新建 `frontend/src/components/MarketResearchProgressCard.tsx`
- [x] 3.2 组件包含两个区域：搜索来源列表（上方）+ 进度日志列表（下方）
- [x] 3.3 搜索来源列表：显示 `🔍 网页搜索：{url}` 格式，支持 `title` 可选显示
- [x] 3.4 进度日志列表：显示每条日志消息
- [x] 3.5 两个区域均有 max-h 限制，内容超出显示滚动条
- [x] 3.6 新增内容时 auto-scroll 到底（`ref.scrollIntoView`，smooth behavior）
- [x] 3.7 空数据处理：搜索源为空显示"正在搜索…"，日志为空显示"正在启动…"
- [x] 3.8 移动端适配（variant='mobile'）

## 4. 结果卡片组件 MarketResearchResultCards

- [x] 4.1 新建 `frontend/src/components/MarketResearchResultCards.tsx`
- [x] 4.2 MarketSummaryCard：市场名称、industry、category、geo_scope、time_scope
- [x] 4.3 MarketSizeCard：TAM/SAM/SOM 数值 + CAGR + 年份
- [x] 4.4 TrendSignalsCard：signal_type + title + summary + impact 标签
- [x] 4.5 TargetUsersCard：segment_name + user_profile + core_scenarios + pain_points
- [x] 4.6 CompetitiveLandscapeCard：复用现有组件（数据字段适配）
- [x] 4.7 OpportunityCard：market_attractiveness + competition_intensity + key_opportunities + key_risks + recommended_actions
- [x] 4.8 EvidenceList：可折叠的底部来源列表，展示所有 evidence 的 source_name + source_url + claim
- [x] 4.9 整体容器不可滚动（信息完整展示在 ChatBubble 内），各卡片内部不限制高度

## 5. ChatBubble 集成

- [x] 5.1 ChatBubble 根据 `message.marketResearchSources.length > 0` 判断显示 MarketResearchProgressCard
- [x] 5.2 ChatBubble 根据 `message.marketResearchResult` 存在判断显示 MarketResearchResultCards
- [x] 5.3 进度态 / 完成态切换逻辑：收到 result 时隐藏进度组件、展示结果组件
- [x] 5.4 移除旧的 `isMarketResearchActive ? whitespace-pre-wrap` 渲染分支，替换为进度→结果两态
- [x] 5.5 错误态：现有 `isError && onRetry` 分支已覆盖（不变）

## 6. 测试

- [x] 6.1 测试 ChatMessage 类型扩展（类型检查通过）
- [x] 6.2 测试 MarketResearchProgressCard 空/正常/截断状态渲染
- [x] 6.3 测试 MarketResearchResultCards 各卡片在无数据时的容错渲染
- [x] 6.4 测试 ChatContainer SSE data 事件消费逻辑（通过现有 useChat 测试验证 reducer 行为）
