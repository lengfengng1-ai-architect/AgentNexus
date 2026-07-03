## Why

当前 10 个真实 Agent 文件中混入了 mock 代码（`use_mock_data`、`_load_mock`、`_MOCK_PATH`）。这违反了关注点分离原则：一个文件应该只有一个职责。按约定，真实 Agent 和 Mock Agent 应分属不同文件，Mock 文件以 `mock_` 开头。

## What Changes

- 从以下 10 个 Agent 文件中移除 mock 代码段（`use_mock_data` gate、`_load_mock()`、`_MOCK_PATH`）：
  - `action_recommendations_agent.py`
  - `budget_kpi_agent.py`
  - `execution_planning_agent.py`
  - `strategy_generation_agent.py`
  - `plan_generator_agent.py`
  - `fitness_analysis_agent.py`
  - `plan_data_query_agent.py`
  - `market_analysis_agent.py`
  - `audience_insight_agent.py`
  - `intent_recognition_agent.py`
- 部分 Agent 的 mock 逻辑（有复杂逻辑的）提取为独立文件 `mock_<name>.py`
- 明确规则：真实 Agent 不得包含任何 mock 代码
- Mock 文件以 `mock_` 开头，可独立注册和测试
- 测试文件分拆：`test_*_agent.py` 测真实逻辑，`test_mock_*_agent.py` 测 mock 逻辑
- 更新相关文档

## Capabilities

### New Capabilities
- `mock-agent`: 独立 Mock Agent 注册和测试规范

### Modified Capabilities
- （无 spec 级变更，纯代码级重构）

## Impact

- 修改 10 个 Agent 文件、相关测试文件、文档
- 不改变任何运行时行为（mock 逻辑从 if 分支改为独立文件）
- `settings.use_mock_data` 配置项保留，仅改变路由方式
