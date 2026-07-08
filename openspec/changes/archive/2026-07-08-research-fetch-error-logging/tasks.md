## 1. 异常处理与诊断日志

- [x] 1.1 `backend/app/agents/audience_insight_agent.py`：新增 `import logging` 与模块级 `logger`；将单笼统 `except (TimeoutException, HTTPError, Exception)` 拆为 3 类分支，每类补 `logger.warning` / `logger.exception`
- [x] 1.2 `backend/app/agents/product_research_agent.py`：3 个 except 分支补 `logger.warning` / `logger.exception`
- [x] 1.3 `backend/app/agents/market_research_agent.py`：3 个 except 分支补 `logger.warning` / `logger.exception`

## 2. 验证

- [x] 2.1 三个 agent 模块导入正常，`logger` 注册到正确的 module name
- [x] 2.2 运行 `pytest tests/test_agents/test_audience_insight_agent.py tests/test_agents/test_product_research_extra.py tests/test_agents/test_market_research.py`，全部通过（15 passed）
