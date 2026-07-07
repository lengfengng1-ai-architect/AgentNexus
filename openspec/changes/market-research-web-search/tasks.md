## 1. 基础设施

- [ ] 1.1 新建 `backend/app/prompt_templates/market_research_extract.md.j2` 提取 prompt 模板（骨架已获确认，最终措辞需用户 review）
- [ ] 1.2 新建 `backend/mock_data/market_research/` 目录，添加至少运动服装品类预设 mock 数据

## 2. 核心 Agent 重写

- [ ] 2.1 重写 `backend/app/agents/market_research_agent.py`：去掉对 `market_analysis_agent` 的 7 个 `call_node_*` import，改为从 `llm_utils` 导入 `duckduckgo_search` / `write_log` / `build_chat_model`
- [ ] 2.2 实现 `search_node`：4 个关键词并行调用 `duckduckgo_search`，去重后返回 URL 列表
- [ ] 2.3 实现 `fetch_node`：并发抓取网页（httpx、15s 超时、8000 字符截断、跳过非 HTML/PDF/图片）
- [ ] 2.4 实现 `extract_node`：单次 `with_structured_output` LLM 调用，从网页内容提取四个字段组（market_definition / market_size / trends / opportunities），输出映射为 `MarketResearchOutput`
- [ ] 2.5 重写 `run_market_research`：串联 search → fetch → extract，处理新建 `_build_output` 映射，支持 `USE_MOCK_DATA=true` 模式（读取 mock 文件跳过联网）
- [ ] 2.6 调整 `register("market_research", run_market_research)` 指向新的 `run_market_research`，验证无 import 循环

## 3. 测试覆盖

- [ ] 3.1 重写 `backend/tests/test_agents/test_market_research.py`：mock `duckduckgo_search` + mock LLM extraction，覆盖正常提取、搜索为空、mock 模式三种场景
- [ ] 3.2 运行 `pytest tests/` 全面回归，确认已有的 product_research / audience_insight / plan_generation_service 等测试不受影响
