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
4. 在 `backend/app/agents/__init__.py` 中 `import` 你的模块（触发注册）
5. 写测试：`backend/tests/test_agents/test_your_name_agent.py`

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


async def run_market_research(state: dict) -> dict:
    brand_input = state.get("brand_input")
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

主流程 `backend/app/agents/orchestrator.py` 会在运行时从 `registry` 查找 Agent 名称，不需要你修改 orchestrator。

工作流 YAML 示例：

```yaml
id: brand_research_pipeline
name: 品牌调研流水线
version: "0.1"
nodes:
  - id: extract
    agent: chat_extraction
    input_mapping:
      message: "$.input.message"

  - id: market_research
    agent: market_research
    depends_on: [extract]
    input_mapping:
      brand_input: "$.outputs.extract.brand_input"

edges:
  - from: extract
    to: market_research
  - from: market_research
    to: __end__
```

---

## 3. 底座维护者负责什么

如果你是主流程/底座维护者，需要维护以下文件：

- `backend/app/agents/registry.py` — Agent 注册表
- `backend/app/agents/orchestrator.py` — LangGraph 图构建
- `backend/app/services/workflow_service.py` — YAML 加载与校验
- `backend/app/routers/workflows.py` — HTTP 路由
- `backend/workflows/*.yaml` — 工作流定义文件

新增 Agent 节点本身**不需要改这些文件**，只有当 Agent 入口签名变更、或者要支持新的编排语义（如并行、条件分支、持久化）时才需要改底座。

---

## 4. 禁止事项

| 禁止 | 原因 | 正确做法 |
|------|------|---------|
| 直接改 orchestrator.py 加自己的节点 | 破坏可插拔原则 | 用 registry.register 注册 |
| 在 Agent 里 import routers/services 主流程 | 循环依赖 | 只暴露 `run_xxx(state)` 入口 |
| 返回非 dict / 不可序列化对象 | LangGraph state 需要可序列化 | 返回 dict 或 Pydantic model.dict() |
| 不注册就写测试 | 测试找不到 handler | 先 register 再 import 测试 |

---

## 5. 参考

- [agent-framework.md](./agent-framework.md) — LangGraph + DeepAgents 技术约束
- [agent-node-dev-guide.md](./agent-node-dev-guide.md) — Agent 节点开发手册
- [directory-structure.md](./directory-structure.md) — 目录结构规范
- [../api/workflows.yaml](../api/workflows.yaml) — 工作流编排 API 契约
