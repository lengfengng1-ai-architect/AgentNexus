## Context

当前 10 个真实 Agent 文件中混入了 mock 逻辑。同一个文件既处理真实 LLM 调用，又处理 mock 数据返回，违反单一职责原则。

需要的改动：移除 Agent 文件中的 mock 代码，mock 逻辑要么删掉（如果只是读 JSON 的简单模式），要么提到独立 `mock_` 文件（如果有复杂逻辑）。`settings.use_mock_data` 开关保留。

## Goals / Non-Goals

**Goals:**
- 所有真实 Agent 文件不含 `use_mock_data`、`_load_mock`、`_MOCK_PATH` 相关代码
- 复杂 mock 逻辑提取为 `mock_*.py` 独立文件，以 `mock_` 开头
- 测试文件按真实/ mock 分开
- 更新文档明确此规则

**Non-Goals:**
- 不改变 `settings.use_mock_data` 的行为
- 不改变任何 Agent 的注册机制
- 不修改 YAML 工作流定义

## Decisions

### 分类处理

| 类型 | Agent | 处理方式 |
|------|-------|---------|
| 简单 JSON mock（`_load_mock` 读静态 JSON） | `action_recommendations`, `budget_kpi`, `execution_planning`, `strategy_generation`, `plan_generator`, `fitness_analysis`, `plan_data_query` | 直接删除 mock 代码，不建独立 mock 文件 |
| 复杂逻辑 mock（正则/关键词匹配） | `intent_recognition` | 提取 `mock_run_intent_recognition` + 辅助函数到 `mock_intent_recognition_agent.py` |
| 真实路径也调 LLM 且有 mock gate | `market_analysis`, `audience_insight` | 删除 mock 代码 |
| 已有独立 mock 文件或 stub | `product_research`, `market_research` | 已处理 |

### 测试

每个有 mock 文件的 agent，测试分两个文件：
- `test_<name>_agent.py` — 测真实逻辑（mock LLM）
- `test_mock_<name>_agent.py` — 测 mock 逻辑（独立运行）

## Risks / Trade-offs

- [低] 如果后续需要新增 mock agent，必须新建 `mock_` 文件，不能直接在真实 agent 中加 if 分支
