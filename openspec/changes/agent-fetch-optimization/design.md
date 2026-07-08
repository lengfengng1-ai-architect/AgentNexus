## Context

product_research_agent 和 audience_insight_agent 的 fetch 阶段与 market_research_agent 结构完全相同：`asyncio.gather` 同时发起 25 个 HTTP 请求。日志显示这两个 agent 在加了代理后运行时间偏长（~40s+），而 market_research 在做了相同优化后已有明显提升。

当前状态：
- product_research_agent.py: `FETCH_TIMEOUT=15`、`MAX_PAGE_CHARS=8000`、无 Semaphore、无 BLOCKED_DOMAINS
- audience_insight_agent.py: 同上
- market_research_agent.py: 已优化完毕（FETCH_TIMEOUT=10、MAX_PAGE_CHARS=4000、Semaphore(8)、BLOCKED_DOMAINS）

## Goals / Non-Goals

**Goals:**
- product_research 和 audience_insight 的 fetch 阶段耗时减少 40-60%
- 两个 agent 运行时间从 ~40s 降到 ~20s
- 与 market_research 的常量对齐，三个 agent 使用相同的性能参数

**Non-Goals:**
- 不改 LLM 提取逻辑
- 不改输出 schema
- 不改 market_research（已优化完毕）

## Decisions

### Decision 1：复用在 market_research 上已验证的优化参数

直接在 product_research 和 audience_insight 上应用相同的改动，参数值完全一致：

| 参数 | 旧值 | 新值 | 理由 |
|------|------|------|------|
| FETCH_TIMEOUT | 15 | 10 | 10s 超时足够覆盖正常响应，慢站快速放弃 |
| FETCH_CONCURRENCY | 无(25并发) | 8 | 避免 25 个请求涌出导致连接拥堵 |
| MAX_PAGE_CHARS | 8000 | 4000 | 关键信息在页面前半段，对齐三个 agent |
| BLOCKED_DOMAINS | 无 | `zhuanlan.zhihu.com` `baike.baidu.com` `wenku.baidu.com` | 这些域名确定 403，提前过滤不浪费 |

### Decision 2：改动方式一致

product_research 的 fetch 代码在 `fetch_node` 函数内，audience_insight 在 `fetch_node` 内，market_research 在 `_fetch` 内。虽然函数名不同，但改法完全一致——在 `asyncio.gather` 前套一层 Semaphore。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| MAX_PAGE_CHARS 从 8000 降到 4000 可能丢信息 | 三个 agent 场景均已确认：产品规格/功能点、人群关键结论都在前半段；市场调研已改 4000 后无质量问题 |
| BLOCKED_DOMAINS 硬编码不够灵活 | 如果新增屏蔽域名，后续可提取到配置或环境变量 |
