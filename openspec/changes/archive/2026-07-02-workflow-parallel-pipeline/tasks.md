## 1. Orchestrator 并行改造

- [x] 1.1 修改 `build_graph` 支持多个无依赖入口节点（fan-out）
- [x] 1.2 实现 `depends_on` 驱动的 fan-in 逻辑
- [x] 1.3 更新拓扑排序支持 `depends_on` 代替边构建

## 2. Agent 注册

- [x] 2.1 在 `product_research_agent.py` 底部添加 registry handler 函数
- [x] 2.2 在 `audience_insight_agent.py` 拆分为 `audience_search` 和 `generate_persona` 两个 handler
- [x] 2.3 在 `__init__.py` 中注册 `product_research`、`audience_search`、`generate_persona`

## 3. Workflow 定义

- [x] 3.1 创建 `backend/workflows/audience_insight_pipeline.yaml`

## 4. 测试

- [x] 4.1 创建 `backend/tests/test_agents/test_parallel_orchestrator.py` — 并行 fan-out/fan-in 测试
- [x] 4.2 运行全量测试确认无回归
