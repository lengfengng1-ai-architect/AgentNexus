## Why

流水线中 product_research 和 audience_insight agent 的 fetch 阶段在和 market_research 做完相同优化后依然运行时间偏长（~40s+，预期 ~20s）。原因是它们同样存在 25 页并发抓取无控制、超时 15s 过长、未屏蔽 403 域名的问题。需要将 market_research 上已验证的优化方案（Semaphore + 超时缩短 + BLOCKED_DOMAINS + MAX_PAGE_CHARS 对齐）复制到这两个 agent。

## What Changes

- product_research_agent.py:
  - 新增 `FETCH_CONCURRENCY = 8` 常量
  - `FETCH_TIMEOUT 15` → `10`
  - `MAX_PAGE_CHARS 8000` → `4000`
  - `BLOCKED_DOMAINS` 集合，`_search` 去重时跳过已知 403 域名
  - `fetch_node` 中引入 `asyncio.Semaphore(FETCH_CONCURRENCY)`
- audience_insight_agent.py：相同改动

**不修改的内容**：
- 不改 LLM 提取逻辑
- 不改输出 schema
- 不改其他 agent（market_research 已单独优化完毕）

## Capabilities

### New Capabilities
- 无（纯性能优化）

### Modified Capabilities
- `plan-generation-pipeline`: product_research 和 audience_insight 的 fetch 阶段增加并发控制、超时优化和 403 域名屏蔽

## Impact

只改 `backend/app/agents/product_research_agent.py` 和 `backend/app/agents/audience_insight_agent.py`，不涉及其他模块。
