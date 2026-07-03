# Agent 注册与编排底座规范

> 本文件说明如何把新 Agent 节点接入 LangGraph 可配置编排底座。  
> 如果你是 Agent 节点开发者，只需关心 **第 1 节** 和 **第 2 节**。

---

## 1. 你负责什么

你只需写自己的 Agent 文件，**不要改主流程代码**。

### 1.1 必须做的事

1. 在 `backend/app/agents/` 下新建 `your_name_agent.py`
2. 实现一个异步入口函数：`async def run_your_name(state: dict) -> dict`
3. 在自己的模块里调用 `registry.register("your_name", run_your_name)`
4. 调用 LLM 时使用 `from app.agents.llm_utils import build_chat_model`，不要自己写 `_build_model()`
5. 在 `backend/app/agents/__init__.py` 中 `import` 你的模块（触发注册）
6. 写测试：`backend/tests/test_agents/test_your_name_agent.py`

### Mock Agent（可选）

如果需要为 Agent 提供 mock 实现（例如用于测试或离线演示），**必须新建独立文件**，文件以 `mock_` 开头：

- 文件：`backend/app/agents/mock_your_name.py`
- 通过 `registry.register_mock("your_name", mock_run_your_name)` 注册
- 在 `__init__.py` 中 import 触发注册
- 测试文件：`tests/test_agents/test_mock_your_name.py`

**真实 Agent 文件禁止包含 mock 代码**（禁止 `use_mock_data`、`_MOCK_PATH`、`_load_mock`）。

### 1.2 入口函数签名

```python
async def run_your_name(state: dict) -> dict:
    """Agent 节点入口。

    Args:
        state: 工作流当前状态，包含 input、outputs、status 等字段。
               具体输入按 YAML 中的 input_mapping 注入。

    Returns:
        dict: 节点输出，会被合并到 state.outputs[节点ID] 中。
    """
    ...
```

### 1.3 最小示例

```python
"""Agent: market_research。

对应 OpenSpec: docs/api/paths/market_research.yaml
对应 in_scope ID: market-research
"""

from app.agents.registry import register
from app.agents.llm_utils import build_chat_model


async def run_market_research(state: dict) -> dict:
    brand_input = state.get("brand_input")
    # 使用统一 LLM 入口，不要自己写 _build_model()
    llm = build_chat_model()
    # 调用 LLM、查询 mock 数据等
    return {
        "target_city": brand_input.get("city"),
        "insights": ["趋势一", "趋势二"],
    }


register("market_research", run_market_research)
```

然后在 `backend/app/agents/__init__.py` 里加一行：

```python
from app.agents import market_research_agent  # noqa: F401
```

---

## 2. 主流程怎么调度你

主流程 `plan_generation_service.py` 在运行时从 `registry` 查找 Agent 名称，不需要你修改编排代码。`register()`/`get_handler()` 机制本身仍然活跃——你在 `register("xxx", my_handler)` 注册的 handler 会被 plan pipeline 自动发现。

---

## 3. 禁止事项

| 禁止 | 原因 | 正确做法 |
|------|------|---------|
| 直接在 plan_generation_service.py 之外改编排 | 破坏可插拔原则 | 用 registry.register 注册 |
| 在 Agent 里 import routers/services 主流程 | 循环依赖 | 只暴露 `run_xxx(state)` 入口 |
| 返回非 dict / 不可序列化对象 | LangGraph state 需要可序列化 | 返回 dict 或 Pydantic model.dict() |
| 不注册就写测试 | 测试找不到 handler | 先 register 再 import 测试 |

---

## 4. 参考

- [agent-framework.md](./agent-framework.md) — Agent 框架技术约束
- [agent-node-dev-guide.md](./agent-node-dev-guide.md) — Agent 节点开发手册
- [directory-structure.md](./directory-structure.md) — 目录结构规范
- [plan_generation_service.py](../../backend/app/services/plan_generation_service.py) — Plan pipeline StateGraph 编排源码
