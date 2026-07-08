## Context

市场调研 agent（`backend/app/agents/market_research_agent.py`）的 `_fetch` 函数使用 `asyncio.gather` 同时发起 25 个 HTTP 请求抓取搜索结果页面。日志显示整体 fetch 阶段耗时约 40-60s，而产品调研 agent 约 15-25s。

原因分析：
- 搜索词不同导致搜索结果页面类型不同。市场调研搜到行业门户、数据站页面，加载慢
- 当前无并发控制，25 个请求同时涌出，慢站（如 sport.gov.cn）的 TCP 连接积压
- 超时 15s 导致单页慢站拖延整体时间
- 已知 403 域名（知乎、百度百科、百度文库）在抓取阶段才报错，浪费并发槽位

优化为 fetch 阶段增加并发控制 + 缩短超时 + 提前过滤 403 域名。

## Goals / Non-Goals

**Goals:**
- 市场调研 agent 的 fetch 阶段耗时减少 40-60%
- 整体运行时间从 ~57s 降到 ~20-30s，接近产品调研 agent
- 不影响数据质量和 LLM 提取结果

**Non-Goals:**
- 不改 LLM 提取逻辑（_extract 不动）
- 不改输出 schema（MarketResearchOutput 不变）
- 不改其他 agent
- 不缩减 MAX_PAGE_CHARS（保持 8000 字符不变，质量优先）

## Decisions

### Decision 1: Semaphore(8) 代替无限制并发

当前 `asyncio.gather` 同时发出 25 个请求。行业数据站响应慢，25 个并发连接导致：
- TCP 连接池耗尽，慢站的响应进一步变慢
- 少数几个慢站拖垮整体 fetch 时间

Semaphore(8) 保证同时最多 8 个请求在飞，请求完成后释放槽位给下一个，整体吞吐不受慢站堵塞。

**备选方案**：`asyncio.as_completed` + 按序处理，但与 Semaphore 效果相同，实现更复杂。

### Decision 2: FETCH_TIMEOUT 15→10s

日志显示可正常加载的行业门户页面通常在 3-8s 内完成，10s 是合理阈值。超时 10s 放弃的页面通常是内容密度低的重广告页面或慢速政府站。

### Decision 3: BLOCKED_DOMAINS 在搜索去重阶段过滤

在 `_search` 函数的去重循环中新增域名检查，URL 的 hostname 落入 `BLOCKED_DOMAINS` 集合的直接跳过。这样这些 URL 不会进入后面的 fetch 阶段，既不浪费连接也不占用 Semaphore 槽位。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 超时 10s 可能丢掉个别有价值的慢页面 | 日志显示超时的多为政府站、广告门户，内容密度低。如后续发现丢失关键页面，可回调到 12s |
| Semaphore(8) 可能放弃"等几分钟也能拿到"的慢页面 | Semaphore 不限制总数，只控制并发。全部 25 个仍然会抓完，只是不一起涌 |
| BLOCKED_DOMAINS 硬编码不够灵活 | 如果出现新的 403 域名，后续可改为配置或环境变量 |
