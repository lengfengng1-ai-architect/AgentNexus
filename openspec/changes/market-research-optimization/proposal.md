## Why

市场调研 agent 在流水线并行节点中运行时间显著长于产品调研和人群洞察 agent（日志显示约 57s vs 20s，慢约 3 倍）。三个 agent 结构相同，但市场调研搜索到的行业门户页面更重、更慢，且存在大量 403 禁止请求拖累整体进度。此变更为优化其 fetch 阶段性能。

## What Changes

- 在 `_fetch` 中引入 Semaphore(8) 控制并发，避免 25 个请求同时涌出
- 超时将 `FETCH_TIMEOUT 15` → `10`，慢页面快速放弃
- 在 `_search` 的去重阶段新增 `BLOCKED_DOMAINS` 集合，跳过已知 403 的域名（zhuanlan.zhihu.com、baike.baidu.com、wenku.baidu.com）

**不修改的内容**：
- 不缩减 `MAX_PAGE_CHARS` 8000→4000（质量优先）
- 不改 LLM 提取逻辑 `_extract`
- 不改输出 schema
- 不改其他 agent

## Capabilities

### New Capabilities
- 无（纯性能优化）

### Modified Capabilities
- `plan-generation-pipeline`: 市场调研 fetch 阶段增加并发控制和超时优化

## Impact

只改 `backend/app/agents/market_research_agent.py`，新增常量和 Semaphore 逻辑，不涉及：
- 其他 agent
- API 层
- 输出 schema
- 数据库依赖
