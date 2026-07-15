## 1. 后端 EventBus — asyncio.Queue 替换 astream_events

- [x] 1.1 修改 `market_analysis_service.py`：`analyze_stream` 替换为手动顺序节点循环 + asyncio.Queue + emit 回调注入
- [x] 1.2 保留同步 `analyze()` 函数不变，确认同步路径不经过 `_graph`
- [x] 1.3 新增 `SSEManager` 工具类（`agents/tools/event_stream.py`）封装 emit/event 类型
- [ ] 1.4 测试：验证 SSE 流按正确顺序 emit progress → tool_call_start → search_result → tool_call_end → content_delta → data → node_end

## 2. 后端节点改造 — 真实 web_search + content_delta

- [x] 2.1 在 `market_analysis_agent.py` 新增 `_llm_json_stream()` 函数（同步 `_llm_json` 保留不变）
- [x] 2.2 改造 `call_node_define()`：增加 emit 参数 + 搜索关键词（市场定义/分类标准/行业现状）+ 搜索结果注入 `search_context`
- [x] 2.3 改造 `call_node_size()`：增加 emit + 搜索关键词（市场规模/增长数据/相关报告）
- [x] 2.4 改造 `call_node_trends()`：增加 emit + 搜索关键词（行业趋势/政策方向/技术动态）
- [x] 2.5 改造 `call_node_users()`：增加 emit + 搜索关键词（目标用户画像/消费行为/痛点）

## 3. 后端节点改造（续）

- [x] 3.1 改造 `call_node_competitors()`：增加 emit + 搜索关键词（竞争品牌/产品定价/市场份额）
- [x] 3.2 改造 `call_node_assess()`：增加 emit + 搜索关键词（市场机会/进入壁垒/风险因素）
- [x] 3.3 改造 `call_node_synthesize()`：增加 emit + content_delta 推送完整报告段落
- [x] 3.4 确认同步路径 `research_market()` 不受影响，继续使用 `_llm_json`

## 4. 后端 Prompt 模板改造

- [x] 4.1 在 `research_define.md.j2` 增加 `search_context` 变量占位
- [x] 4.2 在 `research_size.md.j2` 增加 `search_context` 变量占位
- [x] 4.3 在 `research_trends.md.j2` 增加 `search_context` 变量占位
- [x] 4.4 在 `research_users.md.j2` 增加 `search_context` 变量占位
- [x] 4.5 在 `research_competitors.md.j2` 增加 `search_context` 变量占位
- [x] 4.6 在 `research_assess.md.j2` 增加 `search_context` 变量占位
- [x] 4.7 在 `research_synthesize.md.j2` 增加 `search_context` 变量占位

## 5. 前端公共 Hook — useMarketResearchStream

- [x] 5.1 新增 `hooks/useMarketResearchStream.ts`：封装 SSE fetch + ReadableStream 解析 + 9 种事件类型分发
- [x] 5.2 暴露 `startMarketResearch`（启动流）、`activeIds`（正在运行的消息 ID）、`activeSearches`（当前搜索状态列表）
- [x] 5.3 集成现有 `useChat` dispatch（`updateMessageContent`/`appendMarketResearchSources`/`appendMarketResearchLog`/`setMarketResearchResult`/`setMarketResearchDone`）
- [x] 5.4 内置 AbortController 生命周期管理（组件卸载自动中止、新请求取消旧请求）
- [ ] 5.5 测试：验证 `startMarketResearch` 正确处理 tool_call_start → search_result → tool_call_end → content_delta → data → node_end → result 事件序列

## 6. 前端组件新增/改造

- [x] 6.1 新增 `components/ToolCallStatusBar.tsx`：显示 `🌐 {query}` + spinner，支持多条并发
- [x] 6.2 新增 `components/SourceCard.tsx`：搜索来源卡片（favicon + title + url + snippet），slideIn 动画
- [x] 6.3 改造 `components/MarketResearchProgressCard.tsx`：集成 ToolCallStatusBar、来源卡片区域增强 slideIn 动画
- [ ] 6.4 测试：MarketResearchProgressCard 空数据/加载态/错误态覆盖

## 7. 前端 ChatContainer / ScreenChat 消重

- [x] 7.1 `ChatContainer.tsx`：删除 `handleStartMarketResearch` 局部实现，改用 `useMarketResearchStream` hook
- [x] 7.2 `ScreenChat.tsx`：删除 `handleStartMarketResearch` 局部实现，改用 `useMarketResearchStream` hook
- [x] 7.3 确认 auto-trigger 逻辑（useEffect detection on `canStartMarketResearch`）由 hook 内部管理
- [ ] 7.4 测试：ChatContainer 和 ScreenChat 市场分析流程端到端验证

## 8. 存量文件清理与验证

- [x] 8.1 运行 `openspec validate` 验证所有 artifacts 完整性
- [x] 8.2 代码变更已提交到 git，可回滚
- [x] 8.3 同步测试：检查现有市场分析测试，确认是否需要适配
- [ ] 8.4 人工 Review 确认：SSE 事件向后兼容、移动端样式正确、搜索失败不阻塞流程
