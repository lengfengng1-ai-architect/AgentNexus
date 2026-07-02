## 1. Mock 数据 — 盟域实体级数据

- [x] 1.1 创建 `backend/mock_data/leagues.json` — 5 城市 × 各 8-15 条盟域 records
- [x] 1.2 创建 `backend/mock_data/influencers.json` — 5 城市 × 各 10-20 条达人 records
- [x] 1.3 创建 `backend/mock_data/stores.json` — 经营社独立实体
- [x] 1.4 创建 `backend/mock_data/brand_dimension_map.json` — 品牌→维度映射

## 2. DataProvider 接口扩展

- [x] 2.1 在 `backend/app/services/data_provider.py` 的 DataProvider Protocol 中新增 6 个方法
- [x] 2.2 MockDataProvider 实现以上所有方法（含过滤逻辑）

## 3. DataQueryOutput Schema 扩展

- [x] 3.1 在 `backend/app/schemas/data_query.py` 中扩展 DataQueryOutput

## 4. Data Query Agent 重写

- [x] 4.1 在 `backend/app/agents/data_query_agent.py` 中实现维度路由
- [x] 4.2 当 brand_dimension_map 无对应品类时 fallback 到全量摘要

## 5. Prompt 模板

- [x] 5.1 创建 `backend/app/prompt_templates/data_query.md.j2`

## 6. 工作流 YAML 更新

- [x] 6.1 更新 `backend/workflows/chat_pipeline.yaml` 中 data_query 节点的 input_mapping

## 7. 测试

- [x] 7.1 DataProvider 测试：每个新增方法覆盖正常过滤和空结果路径
- [x] 7.2 data_query_agent 测试：维度路由、fallback、城市不存在、品牌上下文
- [x] 7.3 22 tests, all passed

## 8. 向后兼容

- [x] 8.1 旧 Workflow（不含 brand_name/category 的）仍可正常运行（Legacy 3 tests pass）
- [x] 8.2 allygo_city_data.json 仍可被 get_city_data() 正常读取
