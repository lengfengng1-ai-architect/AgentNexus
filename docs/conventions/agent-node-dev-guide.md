# Agent 节点开发手册

> 本文件给负责具体 Agent 能力开发的工程师阅读。  
> 你的职责：**实现一个可被主流程编排的 LangGraph 节点**，不是写整个系统，也不是写前端/路由/主流程。

---

## 1. 你的职责范围

### 你负责

- 在 `backend/app/agents/` 下新增一个 Agent 文件
- 设计该 Agent 的输入/输出 Pydantic schema
- 编写 Jinja2 prompt 模板
- 使用 `build_chat_model()` 调用 LLM
- 通过 `registry.register()` 注册入口函数
- （可选）注册 mock handler 供 `use_mock_data` 模式使用
- 编写对应的单元测试

### 你不负责

- FastAPI 路由（`routers/`）
- 调用 `_build_model()` —— 统一用 `from app.agents.llm_utils import build_chat_model`
- 主流程 LangGraph 编排（由 `orchestrator.py` 通过 YAML 配置）
- 架构决策、技术选型、新增依赖审批

---

## 2. 开发前必须做的事

### Step 1：确认 OpenSpec 已存在

检查 `docs/api/paths/` 是否有对应当前 Agent 的 YAML 文件。  
**没有 spec，不写代码。** 让产品经理或主流程负责人先补 spec。

### Step 2：确认在 superpowers 范围内

读取 `docs/superpowers.yaml`。  
如果你的功能在 `out_scope` 里，停止开发，告知项目负责人。  
如果不在 `in_scope` 也不在 `out_scope`，按 `out_scope` 处理。

### Step 3：查 CodeGraph

每次编码前必须查 CodeGraph，避免重复实现、避免命名冲突、避免改坏调用方。

```bash
codegraph explore "<你的agent名>"
```

---

## 3. 一个 Agent 文件的标准结构

参考 `backend/app/agents/*_agent.py`，所有新 Agent 必须遵循此模板。

```python
"""Agent: <能力名称>。

对应 OpenSpec: docs/api/paths/<xxx>.yaml
对应 in_scope ID: <从 superpowers.yaml 填写>
"""

from app.agents.registry import register
from app.agents.llm_utils import build_chat_model
from app.config.settings import settings
from app.schemas.<domain> import <AgentOutput>


async def run_<agent>(state: dict) -> dict:
    """Agent 入口函数。"""
    input_val = state.get("input_field")
    if not input_val:
        raise ValueError("Missing required input: input_field")

    if settings.use_mock_data:
        return <AgentOutput>(...).model_dump()

    llm = build_chat_model().with_structured_output(<AgentOutput>)
    result = await llm.ainvoke([...])
    return result.model_dump()


register("<agent>", run_<agent>)


# (可选) Mock handler
async def mock_run_<agent>(state: dict) -> dict:
    return <AgentOutput>(...).model_dump()

# 在 __init__.py 中：
# register_mock("<agent>", mock_run_<agent>)
```

### 关键约定

| 项 | 约定 |
|----|------|
| 文件命名 | `backend/app/agents/<agent_name>_agent.py`，`agent_name` 用 snake_case |
| schema 文件 | `backend/app/schemas/<domain>.py`，Pydantic model 用 PascalCase |
| prompt 文件 | `backend/app/prompt_templates/<agent_name>.md.j2` |
| 入口函数 | `async def run_<agent_name>(state: dict) -> dict` |
| 模型构建 | **必须用 `build_chat_model()`**，禁止自己写 `_build_model()` |
| Mock 注册 | 通过 `register_mock()` 注册，在 `__init__.py` 中 import |

---

## 4. 何时可以用 DeepAgents

DeepAgents 是**可选能力层**，不是默认选择。  
只有节点需要以下能力时才在节点内部使用：

- 自动任务规划（todo list）
- 虚拟文件系统读写
- 子 Agent 委派
- 人机协同（`interrupt_on`）
- 已经验证兼容当前 provider 的 `response_format`

### 使用方式

```python
from deepagents import create_deep_agent

def planning_node(state: PlanState) -> dict:
    agent = create_deep_agent(
        model=_build_model(),
        system_prompt="...",
        tools=[search_events, query_city],
    )
    result = agent.ainvoke({
        "messages": [{"role": "user", "content": state.input_text}]
    })
    return {"plan": result["messages"][-1].content}
```

### 禁止

- 直接用 `create_deep_agent` 一句话替代整个 LangGraph 图
- 在 DeepAgents 里做跨节点状态流转
- 在 DeepAgents 里维护持久化状态

---

## 5. 结构化输出选型

| 场景 | 推荐方式 | 说明 |
|------|---------|------|
| 简单字段提取，多 provider 兼容 | `model.with_structured_output(Schema)` + LangGraph 节点 | 默认方式 |
| 需要 DeepAgents 内置能力 + provider 已验证 | `create_deep_agent(..., response_format=Schema)` | 需先验证 provider 支持 |
| 复杂多步 + 工具 + 人机协同 | `create_deep_agent` 作为子图节点 | 外层仍是 LangGraph |

**特别注意：** `create_deep_agent(..., response_format=...)` 内部可能通过 tool calling 实现结构化输出。Agnes 等 provider 对 tool calling 支持有限，若遇到空返回或异常，优先回退到 `model.with_structured_output(Schema)`。

---

## 6. 测试要求

每个 Agent 必须配测试文件：`backend/tests/test_agents/test_<agent_name>_agent.py`

### 测试原则

- 推荐 mock 模型层以保证 CI 稳定和成本低
- 也可以调用真实 LLM API 做本地验证，但必须在环境变量正确配置且网络可达时运行
- 推荐 mock 图的入口（`_graph.ainvoke`）或具体节点函数
- 多 provider 支持必须分别测试 `_build_model` 分支
- 覆盖率阈值：**80%**

### 真实 API 验证

本地开发时可以直接调用真实 LLM 做效果验证：

- 运行前确保 `backend/.env` 已配置有效 API key
- 推荐写成临时脚本：`backend/scripts/debug_<agent>.py`
- 运行：`uv run python -m scripts.debug_<agent>`
- 不要把真实 API key 写进代码或测试，只从 `.env` 读取

### 最小测试模板

```python
import pytest
from unittest.mock import AsyncMock, patch

from app.agents.<agent_name>_agent import <Agent>Output, run_<agent_name>


@pytest.fixture
def mock_graph():
    with patch("app.agents.<agent_name>_agent._graph") as m:
        m.ainvoke = AsyncMock()
        yield m


@pytest.mark.asyncio
async def test_run_<agent>__normal_input__returns_output(mock_graph):
    mock_graph.ainvoke.return_value = {
        "output": <Agent>Output(reply="hello")
    }

    result = await run_<agent_name>("测试输入")

    assert result.reply == "hello"


@pytest.mark.asyncio
async def test_build_model__agnes_provider__uses_agnes_config(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "agnes")
    monkeypatch.setattr(settings, "agnes_api_key", "test-key")

    with patch("app.agents.<agent_name>_agent.init_chat_model") as mock_init:
        from app.agents.<agent_name>_agent import _build_model
        _build_model()

    mock_init.assert_called_once()
```

### 运行测试

```bash
cd backend

# 全量
uv run pytest -v --cov=app --cov-report=term-missing

# 只测你的 agent
uv run pytest -v tests/test_agents/test_<agent_name>_agent.py
```

---

## 7. 如何单独验证你的 Agent

### 方式一：写临时脚本（推荐，开发时快速验证）

在 `backend/scripts/` 下新建临时脚本（如 `scripts/debug_<agent>.py`）：

```python
import asyncio
from app.agents.<agent_name>_agent import run_<agent_name>

async def main():
    result = await run_<agent_name>("你的测试输入")
    print(result.model_dump_json(indent=2))

if __name__ == "__main__":
    asyncio.run(main())
```

运行：

```bash
cd backend
uv run python -m scripts.debug_<agent>
```

### 方式二：用 pytest 直接跑

写测试用例调用 `run_<agent_name>`，传入真实输入但 mock 掉 `_graph`。  
最终端到端验证需要在主流程负责人拼入 service/router 后，通过前端或 API 测试。

---

## 8. 禁止事项

以下写法视为违规，Code Review 会打回：

| 禁止 | 原因 | 正确做法 |
|------|------|---------|
| `from langchain_community.chat_models import ChatTongyi` | 社区版已过时 | `init_chat_model` + `langchain-openai` |
| `StateGraph(TypedDict, total=False)` | 状态松散 | Pydantic `BaseModel` |
| 手写 markdown code block 剥离 | 不可靠 | `with_structured_output(Schema)` |
| 自己读 `.env` 或 `os.environ` 构建 model | 配置分散、难测试 | 使用 `_build_model()` |
| 字符串拼接 prompt | 难维护 | Jinja2 模板 |
| 直接 `create_deep_agent` 包整个 Agent | 丢失 LangGraph 编排能力 | LangGraph 图 + DeepAgents 作为节点 |
| 没有测试就提交 | 无法保证回归 | 覆盖率 ≥80% |
| 没有 OpenSpec 就写代码 | 违反项目核心流程 | 先补 spec |
| 编造厂商/赛事/达人名称或数据数值 | 违反数据引用规则 | 全部来自 API/mock |

---

## 9. 提交前的自检清单

- [ ] 我的 Agent 文件放在 `backend/app/agents/<agent_name>_agent.py`
- [ ] 我的 schema 放在 `backend/app/schemas/<domain>.py`
- [ ] 我的 prompt 放在 `backend/app/prompt_templates/<agent_name>.md.j2`
- [ ] 我实现了 `async def run_<agent_name>(...) -> OutputSchema`
- [ ] 我的图是 `StateGraph(...).compile()` 编译出来的
- [ ] 我用了 `_build_model()` 而不是自己读 env
- [ ] 我的输出是 Pydantic model，不是裸字符串/dict
- [ ] 我有对应的 OpenAPI spec 文件
- [ ] 我在 `superpowers.yaml` 的 `in_scope` 内
- [ ] 我写了 `tests/test_agents/test_<agent_name>_agent.py`
- [ ] 我运行了 `uv run pytest`，覆盖率 ≥80%
- [ ] 我没有使用 DeepAgents 包全场
- [ ] 我没有编造任何数据

全部勾选后，再发起 PR。

---

## 10. 如何与主流程负责人协作

1. **开发前**：把你的 Agent 能力范围、输入/输出字段、是否需要持久化/上下文，同步给主流程负责人
2. **开发中**：保持入口函数稳定，主流程只依赖 `run_<agent_name>(...)`
3. **开发完**：提供一段示例调用代码，方便主流程负责人拼入 service/主图
4. **联调时**：主流程负责人会把你的 Agent 作为 LangGraph 节点加入主流程，不要自己改主流程文件

你的目标是：**节点本身可独立运行、可独立测试；拼进主流程时不需要改你的代码。**

---

## 11. 参考文件

- [agent-framework.md](./agent-framework.md) — 完整框架规范
- [testing.md](./testing.md) — 测试规范
- [directory-structure.md](./directory-structure.md) — 目录结构
- [../superpowers.yaml](../superpowers.yaml) — 能力边界
- `backend/app/agents/chat_extraction_agent.py` — 最小可运行示例
- `backend/tests/test_agents/test_chat_extraction_agent.py` — 最小测试示例
