## Why

当前 data_query Agent 只接收 `city` 一个参数，从 `allygo_city_data.json` 查询城市级别的汇总数据（盟域总数、达人总数等统计摘要）。这种粗粒度的数据无法支撑后续的营销方案生成、品牌适配度评估。

实际业务场景中，data_query 需要根据**品牌需求（品类/预算/周期）** 和**人群画像**等上下文，从 AllyGo 平台数据中做智能检索——筛选特定运动类型的盟域、按等级过滤达人、按人群偏好排序活动，并关联盟内部的经营社商品/课程/团购数据。

本 change 的目标：将 data_query 从「只认 city 的查表函数」升级为「带品牌上下文的多维数据查询器」，同时将原有的聚合摘要 mock 数据升级为**实体级 records**。

## What Changes

### Mock 数据（核心变更）

- **新增** `backend/mock_data/leagues.json` — 盟域实体级数据（含 sport_type、member_count、total_fee、credit_score 等全部字段），每个盟域记录附带 stores 子数组
- **新增** `backend/mock_data/brand_dimension_map.json` — 品牌→5维数据映射表（定义不同品牌/品类对各维度的优先级、过滤标签、人群匹配规则）
- **新增** `backend/mock_data/influencers.json` — 达人实体级数据（含 name、sport_type、tier、quote、follower_count 等）
- **新增** `backend/mock_data/stores.json` — 经营社商品/课程/团购数据

### Data Query Agent 扩展

- **扩展输入**：`run_data_query` 接收 city + brand_name + category + query_context 等参数
- **新增维度路由逻辑**：根据 brand/category 从 brand_dimension_map 查优先级，裁剪/加权 5 维数据
- **新增被动过滤支持**：预留 `audience_profile` 参数接口（人群洞察 Agent 下游输出作为 data_query 输入）

### DataProvider 扩展

- **新增** `get_filtered_leagues(city, sport_type=None, tier=None)` 等带参数查询方法
- 保留原有 `get_city_data()` 向后兼容

### 工作流连接

- **更新** `backend/workflows/chat_pipeline.yaml` — data_query 节点的 input_mapping 从仅 city 扩展为 4 个输入参数

## Capabilities

### Modified Capabilities

- `data-query` (AllyGo 数据查询): 从城市级汇总 → 带品牌上下文的多维实体级查询，支持运动类型过滤/达人等级筛选/维度优先级加权

### Related Upstream Capabilities

- `brand-input` (品牌需求录入): 提供 brand_name/category/budget/period 给 data_query
- `market-analysis` (市场分析): 提供市场上下文（行业、人群分群）给 data_query
- 人群洞察 (in development): 未来提供 audience_profile 给 data_query

## Impact

- **Mock 数据新增**：`leagues.json`, `brand_dimension_map.json`, `influencers.json`, `stores.json`
- **Mock 数据更新**：`allygo_city_data.json` 保持向后兼容，部分字段可移除
- **Service 层更新**：`backend/app/services/data_provider.py` — DataProvider 接口新增方法
- **Agent 更新**：`backend/app/agents/data_query_agent.py` — 输入扩展 + 逻辑重写
- **Schema 更新**：`backend/app/schemas/data_query.py` — DataQueryOutput 扩展
- **Workflow 更新**：`backend/workflows/chat_pipeline.yaml` — input_mapping 扩展
- **Prompt 模板新增**：`backend/app/prompt_templates/data_query.md.j2` — 维度路由 prompt
- **测试新增**：`backend/tests/test_agents/test_data_query.py` — 扩展测试覆盖
- **变更量**：4 个新 mock 文件 + 3 个后端文件修改 + 1 个 workflow 修改 + 1 个 prompt 模板 + 测试
