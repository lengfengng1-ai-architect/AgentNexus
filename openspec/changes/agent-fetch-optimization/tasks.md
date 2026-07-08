## 1. product_research_agent.py 优化

- [x] 1.1 在常量区新增 `FETCH_CONCURRENCY = 8` 和 `BLOCKED_DOMAINS` 集合
- [x] 1.2 将 `FETCH_TIMEOUT` 从 15 改为 10，`MAX_PAGE_CHARS` 从 8000 改为 4000
- [x] 1.3 在 `search_node` 的去重循环中增加 `BLOCKED_DOMAINS` 域名检查
- [x] 1.4 在 `fetch_node` 中引入 `asyncio.Semaphore(FETCH_CONCURRENCY)` 控制并发

## 2. audience_insight_agent.py 优化

- [x] 2.1 在常量区新增 `FETCH_CONCURRENCY = 8` 和 `BLOCKED_DOMAINS` 集合
- [x] 2.2 将 `FETCH_TIMEOUT` 从 15 改为 10，`MAX_PAGE_CHARS` 从 8000 改为 4000
- [x] 2.3 在 `search_node` 的去重循环中增加 `BLOCKED_DOMAINS` 域名检查
- [x] 2.4 在 `fetch_node` 中引入 `asyncio.Semaphore(FETCH_CONCURRENCY)` 控制并发

## 3. 回归测试

- [x] 3.1 运行 `pytest tests/test_agents/test_product_research_extra.py` ✅ 7 passed
- [x] 3.2 运行 `pytest tests/test_agents/test_product_research_agent.py` ✅ 3 passed
- [x] 3.3 运行 `pytest tests/test_agents/test_audience_insight_agent.py` ✅ 2 passed
- [ ] 3.4 人工验证：后端启动后跑流水线确认三个 agent 耗时均下降
