## 1. SearxNG 部署文件

- [x] 1.1 新建 `docker/searxng/docker-compose.yml`：SearxNG 镜像、端口 8080、挂载 `settings.yml`，代理端口变量化 `${PROXY_PORT:-7890}`
- [x] 1.2 新建 `docker/searxng/settings.yml`：启用 `search.formats: [html, json]`、设短 `request_timeout`、关闭 redis 依赖
- [x] 1.3 注明启动命令 `cd docker/searxng && docker compose up -d` 和验证 `curl 'http://localhost:8080/search?q=test&format=json'`
- [x] 1.4 新增一键部署脚本 `docker/searxng/deploy.sh`（Linux/macOS/Git Bash）和 `deploy.bat`（Windows）：检查 Docker、按代理端口启动、健康检查

## 2. searxng_search 工具函数

- [x] 2.1 在 `backend/app/agents/llm_utils.py` 新增 `searxng_search(keyword, max_results=10)`：GET `{SEARXNG_URL}/search?q=...&format=json&engines=bing,baidu`，解析 `results[].{url,title,content}` 映射为 `[{href,title,body}]`
- [x] 2.2 `SEARXNG_URL` 从环境变量读，默认 `http://localhost:8080`；失败抛异常（交由 agent 层 except 降级）
- [x] 2.3 单测 `searxng_search`：mock httpx 响应，验证返回结构与 `duckduckgo_search` 一致

## 3. 三个 agent 接入 + 抓取规模提升

- [x] 3.1 `product_research_agent.py`：`search_node` 的 `duckduckgo_search` 换为 `searxng_search`
- [x] 3.2 `market_research_agent.py`：`_search` 的 `duckduckgo_search` 换为 `searxng_search`
- [x] 3.3 `audience_insight_agent.py`：`search_node` 的 `duckduckgo_search` 换为 `searxng_search`
- [x] 3.4 更新现有测试里 mock `duckduckgo_search` 的 patch 路径为 `searxng_search`

## 4. 配置与回归

- [x] 4.1 `backend/.env.example` / `backend/.env` 加 `SEARXNG_URL=http://localhost:8080`
- [x] 4.2 运行 `pytest tests/test_agents/` 全量回归（product/audience/market/llm_utils 测试通过）
- [x] 4.3 人工实测：启动 SearxNG → 跑品牌 → 确认三 agent 搜索均非空、产出非空
