## Context

三个调研 agent 共用 `duckduckgo_search()`（`llm_utils.py`）做网页检索。实测 DDG html 接口对并发请求限流——3 个并发全部返回空。流水线三个 agent 并行、各内部又并行，瞬间 11 个并发请求必然触发限流，导致某个 agent 搜索整批空 → 0 页抓取 → 空产出。

抓取（httpx 并发）本身没问题，瓶颈纯粹在搜索后端。需要换一个"不怕并发"的后端。

## Goals / Non-Goals

**Goals:**
- 搜索后端换为自托管 SearxNG，彻底消除并发限流
- 三个 agent 无缝切换（`searxng_search` 与 `duckduckgo_search` 同构返回）
- 抓取深度从 5 页提到 20 页，调研更全面
- 部署可复现（docker-compose + 配置文件）

**Non-Goals:**
- 不改输出 schema、prompt、LLM 提取逻辑
- 不自动部署 SearxNG（人工执行 docker compose）
- 不接入付费 API
- 不删 `duckduckgo_search`（留作应急）

## Decisions

### 决策 1：选 SearxNG（自托管），不走付费 API

**决策**：自托管 SearxNG 实例，配 `bing, baidu` 引擎（境内可达）。

**理由**：
- 真正免费开源（AGPL），符合"GitHub 免费开源"硬要求
- 自有实例→无限流、无限额、随便并发
- 聚合多引擎→单引擎挂了其他补上，鲁棒性最高
- 可配引擎白名单→境内部署只开 Bing+百度即可工作
- 已用 `npx skills find` 调研过 brave/byted/parallel/firecrawl，均为 SAAS 需 Key/付费，不符要求

**备选（已否决）**：Brave Search API（免费 2000/月但要 Key、境内要代理）；保留 `duckduckgo_search` + 重试（治标不治本，限流仍会发生）。

### 决策 2：`searxng_search()` 与 `duckduckgo_search` 同构

**决策**：新函数签名 `async def searxng_search(keyword, max_results=10) -> list[dict[str,str]]`，返回 `[{href, title, body}]`，与 `duckduckgo_search` 完全一致。

**理由**：三个 agent 的 search 逻辑只改一个函数名，零结构改动，降低回归风险。

**实现**：GET `{SEARXNG_URL}/search?q=<kw>&format=json&engines=bing,baidu`，解析 `results[].{url,title,content}`，映射到 `{href:url, title, body:content}`。

### 决策 3：FETCH_TOP 5 → 20

**决策**：三个 agent 的抓取上限从 5 提到 20。

**理由**：用户要求"查询 20-30 个页面"。搜索候选池（3-4 关键词 × 10 条）本就有 30-40 条，现在只抓 5 条浪费。提到 20 让 LLM 提取有更多真实素材。抓取是 httpx 并发（15s 超时、各页独立），20 页比 5 页多约 5-10s，可接受。

**不改搜索关键词数量**（product 3 / market 4 / audience 4），因为搜索现已稳定（SearxNG 不限流）。

### 决策 4：部署用 docker-compose，启用 JSON 输出

**决策**：`docker/searxng/docker-compose.yml` 挂载 `settings.yml`，关键配置：
- `search.formats: [html, json]`（SearxNG 默认禁用 JSON，必须显式开）
- `outgoing.request_timeout` 设短（10s）
- 引擎白名单在请求级 `engines=` 参数控制（`bing,baidu`）

**理由**：SearxNG 的 JSON 输出默认关闭是官方反滥用措施；自托管场景开启无妨。引擎在请求参数指定而非全局锁定，便于后续按 agent 调整。

### 决策 5：`SEARXNG_URL` 环境变量，无 fallback

**决策**：`SEARXNG_URL` 默认 `http://localhost:8080`。若实例不可达，`searxng_search` 抛异常 → 各 agent 的 `except` 已会捕获 → 该关键词返回空、继续别的关键词（已有降级语义）。

**不做自动 fallback 到 DDG**：避免引入两个后端的复杂性；SearxNG 挂了属于运维问题，应在部署层解决而非代码层兜底。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| **SearxNG 部署门槛**：需 Docker | design 提供 docker-compose 一键启动；本地开发与服务器均可跑 |
| **境内 SearxNG 访问 Bing/Google 受限** | settings 里引擎白名单只开 `bing, baidu`（百度境内必达，Bing 境内可达） |
| **SearxNG 自身 JSON 默认关闭** | settings.yml 显式 `formats: [html, json]`，部署文档强调 |
| **抓 20 页变慢 +5-10s** | 可接受；且并发稳定后整体仍比限流导致的重试/空跑快 |
| **SearxNG 公共实例不稳** | 本方案自托管，不依赖公共实例 |

## Migration Plan

1. 人工部署 SearxNG：`cd docker/searxng && docker compose up -d`，验证 `curl 'http://localhost:8080/search?q=test&format=json'` 返回 JSON。
2. `.env` 加 `SEARXNG_URL=http://localhost:8080`。
3. 改代码：新增 `searxng_search`、三个 agent 调用切换、`FETCH_TOP` 调整。
4. 跑李宁/红牛实测，确认三个 agent 都能搜到结果、抓到 ~20 页、产出非空。

### Rollback
- 代码层：三个 agent 的 `searxng_search` 改回 `duckduckgo_search`（函数仍在）。
- 部署层：`docker compose down` 移除 SearxNG。

## Open Questions

1. **引擎选择**：默认 `engines=bing,baidu`。若实测百度结果质量差，可加 `google`（境外部署时）或 `sogou`。先按 `bing,baidu` 跑，看结果再调。
2. **20 页是否过载 LLM 提取**：20 页正文截断后总 token 可能较大。若 LLM 提取超时或被截断，回退到 15 或 10 页。先用 20 实测。
