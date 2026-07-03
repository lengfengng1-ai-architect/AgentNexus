# Mock Agent 规范

## Purpose

定义独立 Mock Agent 的文件命名、注册方式和测试规范。真实 Agent 和 Mock Agent 严格分离。

## Requirements

### R1: 文件命名

Mock Agent 文件必须以 `mock_` 开头，与真实 Agent 文件在同一目录（`app/agents/`）。例如 `mock_intent_recognition_agent.py` 对应真实 `intent_recognition_agent.py`。

### R2: 注册方式

Mock Agent 通过 `registry.register_mock()` 注册：

```python
# 在 mock_intent_recognition_agent.py 中
from app.agents.registry import register_mock

register_mock("intent_recognition", mock_run_intent_recognition)
```

在 `app/agents/__init__.py` 中 import 触发注册：

```python
from app.agents import mock_intent_recognition_agent  # noqa: F401
```

### R3: 真实 Agent 规范

真实 Agent 文件不得包含以下任何元素：
- `use_mock_data` 检查
- `_MOCK_PATH` 常量
- `_load_mock()` 函数
- 任何 `settings.use_mock_data` 相关的条件逻辑

### R4: 测试规范

Mock Agent 的测试放在 `tests/test_agents/test_mock_<name>.py`，不依赖任何 LLM 配置。

## Scenarios

### Scenario: 新增一个 Mock Agent

- **WHEN** 开发者需要为一个真实 Agent 提供 mock 实现
- **THEN** 必须新建 `mock_<name>.py` 文件，不得在真实 Agent 中增加 mock 代码
- **AND** 在 `__init__.py` 中 import 触发注册
- **AND** 编写 `test_mock_<name>.py` 测试

### Scenario: 审查发现 mock 代码混入真实 Agent

- **WHEN** 代码审查发现真实 Agent 文件包含 `use_mock_data` 或 `_load_mock`
- **THEN** 代码被打回，必须提取到独立 Mock 文件
