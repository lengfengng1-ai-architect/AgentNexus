## 1. Orchestrator 并行完善

- [x] 1.1 修复 orchestrator 的 build_graph 使 fan-in 正常工作（所有上游完成后才执行下游）
- [x] 1.2 处理 build_graph 串行兼容（现有 workflow YAML 不依赖并行）

## 2. Registry handler 持久化

- [x] 2.1 product_research handler 返回前保存到 mock_data/product_info/
- [x] 2.2 audience_search handler 返回前保存到 mock_data/audience_insight/
- [x] 2.3 generate_persona handler 返回前保存到 mock_data/user_persona/

## 3. workflow_service 改用 build_graph

- [x] 3.1 修改 `run_workflow` 使用 `build_graph` 代替 `_execute_nodes`
- [x] 3.2 移除 `workflow_run_service._execute_nodes` 中的手动调度循环
- [x] 3.3 验证 audience_insight_pipeline YAML 在新机制下运行正常

## 4. 测试

- [x] 4.1 更新 `test_parallel_orchestrator.py`
- [x] 4.2 运行全量测试确认无回归
