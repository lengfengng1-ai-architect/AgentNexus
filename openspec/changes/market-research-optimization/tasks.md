## 1. 实现并发控制和超时优化

- [x] 1.1 在 `market_research_agent.py` 常量区新增 `FETCH_CONCURRENCY = 8` 和 `BLOCKED_DOMAINS` 集合
- [x] 1.2 将 `FETCH_TIMEOUT` 从 15 改为 10
- [x] 1.3 在 `_search` 的去重循环中增加 `BLOCKED_DOMAINS` 域名检查，命中则跳过
- [x] 1.4 在 `_fetch` 中引入 `asyncio.Semaphore(FETCH_CONCURRENCY)`，控制 `fetch_one` 的并发数

## 2. 回归测试

- [x] 2.1 运行 `pytest tests/test_agents/test_market_research.py` 全量测试通过
- [x] 2.2 运行 `pytest tests/test_agents/test_product_research_extra.py` 确认未受影响
- [ ] 2.3 人工实测：启动 SearxNG → 跑李宁 → 确认 market_research 耗时下降
