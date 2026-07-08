## Why

三个调研 agent（`product_research` / `market_research` / `audience_insight`）当前用 `duckduckgo_search()`（直连 `html.duckduckgo.com`）做网页检索。实测发现 DDG 对**并发请求严格限流**——同一瞬间发 3 个请求会全部返回空页（HTTP 200 但无结果），不报错、不打招呼。验证脚本：

```
duckduckgo_search('红牛')  单独跑 → 5 条 ✓
3 个并发同时跑            → [0, 0, 0] ❌
```

流水线启动时三个 agent 并行、每个内部又并行搜索，瞬间 11 个并发请求砸向 DDG，被限流后某个 agent 的搜索整批返回空 → 抓取 0 页 → 该 agent 产出空信息 → 方案缺数据。这是 DDG 作为生产搜索后端的根本性缺陷，无法靠重试或限速彻底解决（免费 HTML 接口本就脆弱）。

本变更将搜索后端换为**自托管 SearxNG**（开源元搜索引擎，聚合 Bing/百度/Google 等多引擎），彻底消除单引擎限流问题：自己的实例不限并发、不限配额，某个上游引擎挂了其他引擎补上。

对应 in_scope ID：`plan-generation`（三个 agent 均为 `plan_generation_pipeline` 流水线的并行调研节点）。

## What Changes

- **新增 `searxng_search()` 工具函数**（`backend/app/agents/llm_utils.py`）：通过 SearxNG 实例的 JSON API 检索，返回与原 `duckduckgo_search` 同构的 `[{href, title, body}]`，便于无缝替换。
- **三个调研 agent 的搜索调用从 `duckduckgo_search` 换为 `searxng_search`**：`product_research_agent` / `market_research_agent` / `audience_insight_agent`。
- **`FETCH_TOP` 从 5 提到 20**（product/audience 的 `FETCH_TOP_N` / `FETCH_TOP`，market 对应常量）：搜索候选池取 top 20 页做更深调研（LLM 从更多真实网页提取，信息更全）。
- **`SEARXNG_URL` 环境变量**配置实例地址（默认 `http://localhost:8080`）；附带 `docker-compose` + SearxNG `settings.yml` 部署说明（启用 JSON 输出、限定引擎为 `bing, baidu` 保证境内可达）。
- **保留 `duckduckgo_search`**：不删，作为应急 fallback 备用函数（默认不调用）。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `plan-generation-pipeline`：三个调研节点的搜索后端由 DDG 换为 SearxNG；`FETCH_TOP` 提到 20，要求"搜索 SHALL 通过 SearxNG 聚合多引擎、支持并发不被限流"。
- `agent-operation-log`：搜索阶段的关键日志（引擎选择、结果数、失败降级）SHALL 落盘 `app.log`，与已有的 fetch 诊断日志一致。

## Non-goals

- 不改各 agent 的输出 schema（`MarketResearchOutput` / `ProductResearchResult` / `AudienceRawData` 等契约不变）。
- 不改 LLM 提取环节、不改 prompt 模板文案。
- 不接入付费搜索 API（Brave/字节/Parallel/Firecrawl 均属 SAAS，本次不用）。
- 不删除 `duckduckgo_search` 函数（留作应急）。
- 不在本 change 内自动部署 SearxNG（部署由人工按 design.md 的 docker-compose 执行；代码只读 `SEARXNG_URL`）。

## Mock 数据覆盖说明

本变更不涉及数据流字段变化（仍是搜索→抓取→提取），mock 模式（`USE_MOCK_DATA=true`）行为不变：market_research 读 `mock_data/market_research/`，其余 agent 维持现有 mock 路径。SearxNG 仅在真实模式触发。

## Impact

- **代码**：
  - `backend/app/agents/llm_utils.py` — 新增 `searxng_search()`。
  - `backend/app/agents/product_research_agent.py` — 调用换 searxng；`FETCH_TOP_N` 5→20。
  - `backend/app/agents/market_research_agent.py` — 调用换 searxng；抓取上限提到 20。
  - `backend/app/agents/audience_insight_agent.py` — 调用换 searxng；`FETCH_TOP` 5→20。
- **部署**：新增 `docker/searxng/docker-compose.yml` + `docker/searxng/settings.yml`（人工 `docker compose up -d` 启动）。
- **配置**：`.env` 新增 `SEARXNG_URL=http://localhost:8080`。
- **依赖**：无新 Python 依赖（httpx 已有）。SearxNG 通过 Docker 部署，不进 `pyproject.toml`。
- **性能**：搜索阶段并发不再被限流，wall-clock 稳定；抓取 20 页比 5 页慢约 +5-10s（httpx 并发，可接受）。
- **下游**：零改动（输出 schema 不变）。
