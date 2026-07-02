## 1. Agent 层——提取公共节点函数

- [x] 1.1 提取 `call_node_define(market_name, category) → dict`
- [x] 1.2 提取 `call_node_size(market_name, definition_dict) → dict`
- [x] 1.3 提取 `call_node_trends(market_name, size_dict) → list`
- [x] 1.4 提取 `call_node_users(market_name, trends_list) → list`
- [x] 1.5 提取 `call_node_competitors(market_name, definition_dict, users_list) → list`
- [x] 1.6 提取 `call_node_assess(market_name, size_dict, trends_list, competitors_list) → dict`
- [x] 1.7 提取 `call_node_synthesize(market_name, all_dicts) → str`
- [x] 1.8 `research_market()` 复用以上函数组装全量

## 2. Schema——新增 SSE data 事件模型

- [x] 2.1 新增 `MarketResearchDataEvent(node, result)` 模型

## 3. Service——逐节点流式输出

- [x] 3.1 重写 `analyze_stream`：逐节点调用 → yield progress → yield data → yield node_end
- [x] 3.2 `result` 事件保留全量 `MarketResearchResult`

## 4. 测试

- [x] 4.1 更新 `test_market_analysis_service.py`：验证流式逐节点 yield 顺序正确
- [x] 4.2 更新 `test_market_analysis_agent.py`：验证新 node 函数输出符合 schema

## 5. 验证

- [x] 5.1 `curl --max-time 600 POST /market-analysis/stream` 验证逐节点 SSE 输出（22 events, 7 节点逐段推送）
- [x] 5.2 `POST /market-analysis` 同步端点回归测试（通过）
- [x] 5.3 `cd backend && uv run pytest` 全量测试通过（42/42 passed）
