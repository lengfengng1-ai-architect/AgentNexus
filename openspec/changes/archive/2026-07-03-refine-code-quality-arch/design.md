## Context

项目通过大约 23 个快速迭代的 OpenSpec 变更后（2026-06-30 至 2026-07-03），backend 代码积累了三类结构性债务：

1. **Service 层重复 Agent 逻辑**：`audience_insight_service.py`、`product_info_service.py`、`market_analysis_service.py` 各自手写了对应 Agent 内部 node 的调用序列和 SSE yield 逻辑，而非调用 Agent 的 `StateGraph.astream_events()`。两个调用路径（service 手动调用 vs agent 内部 graph）会随代码变化漂移。

2. **Agent → Service 反向依赖**：`audience_insight_agent.py` 的 registry handler 中 import `app.services.audience_insight_service.AUDIENCE_DIR`/`PERSONA_DIR`，形成 `service → agent → service` 循环。当前靠函数内延迟 import 绕开，但这是脆弱的。

3. **同步 LLM 调用阻塞事件循环**：`llm_utils.invoke_json()` 使用同步 `.invoke()`，被 13 个调用方使用（在 plan pipeline 的 async LangGraph 中）；`market_analysis_agent.py` 中 7 个 `call_node_*` 函数也使用同步 `.invoke()`，被 service 和 agent 共同使用。

4. **注册名歧义**：`register("audience_insight", run_generate_persona)` 使 `"audience_insight"` handler 只产出画像而不跑 `search→fetch→extract→generate_persona` 全流程。

当前代码架构（简化）：

```
现状架构：

  Router → Service (手写node调用+SSE) → Agent node函数
           ├── market_analysis_service.py → call_node_define/size/trends/...
           ├── audience_insight_service.py → search_node/fetch_node/extract/...
           └── product_info_service.py     → search_node/fetch_node/extract/...

  另：plan_generation_service.py (正确模式)
      → get_handler("node_id") → agent._graph.astream_events() → _translate_event() → SSE
```

## Goals / Non-Goals

**Goals:**

1. 解除 Agent → Service 反向依赖，消除循环依赖风险
2. 三个 Service 统一使用 `astream_events()` 模式，删除手动 node 调用
3. `llm_utils.invoke_json()` 和 `call_node_*` 全量改为异步，不阻塞事件循环
4. 修正 `audience_insight` 注册名指向全流程 handler
5. 清理孤立 `.pyc`、未使用的 mock agent、gitignore 遗漏
6. 修复 `pyproject.toml` 依赖问题
7. 同步过时的 conventions 文档
8. 修复 `check-opsx-change.sh` 硬编码路径

**Non-Goals:**

1. 不创建 `/workflows` 路由（YAML 定义的项目级能力暂搁置）
2. 不创建 `reply_builder` agent
3. 不修改 API 端点签名或 Pydantic schema
4. 不改变外部业务行为
5. 不修改 plan pipeline（`plan_generation_service.py` 已经正确）

## Decisions

### D1: 共享缓存路径模块取代 Agent→Service 导入

```python
# backend/app/config/cache_paths.py
AUDIENCE_DIR = Path("mock_data") / "audience_insight"
PERSONA_DIR = Path("mock_data") / "user_persona"
MOCK_DATA_DIR = Path("mock_data") / "product_info"
# ... _sanitize, _cache_path 等函数
```

**为什么选这个**（而非把路径常量放进 settings.py）：
- 缓存路径与配置无关（与 mock_data 目录绑定，而非环境变量）
- agent 和 service 都需要访问，放在中层模块最自然
- `settings.py` 应保持与环境配置相关，不混入 mock 数据目录常量

**替代方案考虑**：
- 放入 `settings.py` → 不合适，这是目录结构常量而非运行时配置
- 放入各自模块 + 交叉 import → 当前做法，产生循环依赖

### D2: Service 重构为 astream_events 模式

参照 `plan_generation_service.py` 的成熟模式：

```
重构后架构：

  Router → Service (统一调用agent pipeline)
           │
           ├── market_analysis_service.py
           │   → get_handler("market_analysis").astream_events()
           │   → _translate_event() → SSE frames
           │
           ├── audience_insight_service.py
           │   → get_handler("audience_insight").astream_events()
           │   → _translate_event() → SSE frames
           │
           └── product_info_service.py
               → get_handler("product_research").astream_events()
               → _translate_event() → SSE frames
```

具体方案：

- 各 Agent 在 `_build_graph()` 编译后，export `_graph` 作为模块级变量
- Agent 的 registry handler（如 `run_audience_insight`）应暴露 graph 或提供一个直接调 `astream_events` 的入口
- Service 层不再 import agent 内部 node 函数，只 import `get_handler()` 和 graph
- Service 层定义 `_translate_event()` 映射 agent 事件 → SSE 事件

**为什么不用 astream_events v2 直接消费**：
- v2 的事件粒度是 `on_chain_start/on_chain_stream/on_chain_end`，每个 node 触发多个事件
- 需要翻译层来产生前端的 `progress/step/result` 事件
- 这与 `plan_generation_service._translate_event()` 模式一致

### D3: invoke_json 改为异步

`llm_utils.py`:
```python
async def invoke_json(system_prompt: str, user_msg: str) -> dict[str, Any]:
    msg = await build_chat_model().ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_msg),
    ])
    # ... 其余不变
```

调用方（13 个）全部改为 `await invoke_json(...)`，且其所属函数改为 `async def`。

`market_analysis_agent.py`：
```python
async def call_node_define(market_name: str, category: str) -> dict:
    return await _llm_json(...)

async def _llm_json(system_prompt: str, user_msg: str) -> dict:
    msg = await _build_model().ainvoke([...])
    # ...
```

### D4: 创建 wrapper 实现 audience_insight 全流程

```python
async def run_audience_insight_full(state: dict[str, Any]) -> dict[str, Any]:
    """全流程：search → fetch → extract_audience → generate_persona"""
    product_name = state.get("product_name") or state.get("brand_name")
    # 1. search + fetch + extract
    s = await _graph.ainvoke({"product_name": product_name})
    # 2. generate_persona
    persona = await generate_persona_node(...)
    return {
        "audience_data": s.get("audience_data"),
        "persona": persona
    }

register("audience_insight", run_audience_insight_full)
```

`run_generate_persona` 保留为 `"generate_persona"` 注册，供需要单独调画像步骤的场景使用（如市场分析页面的快速画像）。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| C2 重构可能破坏前端 SSE 事件格式 | 先默写预期事件格式，对照前端组件确认（`AnalysisProgress.tsx`、`PlanLogStream.tsx` 等），重构后手测 |
| `invoke_json` 改异步 → 13 个调用方都要改，漏改则运行时 TypeError | 全部调用方在同一个 `backend/app/agents/` 目录下，逐一 grep 确认 |
| `market_analysis_agent._llm_json` 改 async 后 `research_market`（async def）也要改 | `research_market` 已为 async def，只需在内部加 `await` |
| audience_insight 全流程首次运行耗时较长（搜索+读页+两次 LLM 调用） | 这是预期行为，缓存机制不变。SSE 会逐阶段推送进度 |
| `pyproject.toml` 依赖变更可能导致 `uv lock` 解析失败 | 改后运行 `uv lock && uv sync` 验证 |
| Service 重构后缓存读写路径不一致 | 缓存路径统一从 `cache_paths.py` import，避免路径偏移 |

## Data Flow

### C2 重构后的 audience_insight SSE 流：

```
Service:  get_handler("audience_insight").astream_events()
              │
Agent:    on_chain_start("search")         →  {"event": "progress", "step": "search"}
          on_chain_end("search")           →  {"event": "progress", "step": "search_done", "count": N}
          on_chain_start("fetch")          →  {"event": "progress", "step": "fetch", ...}
          on_chain_stream("fetch")         →  {"event": "progress", "step": "fetch_page", "index": i}
          on_chain_end("fetch")            →  {"event": "progress", "step": "fetch_done"}
          on_chain_start("extract_audience")→  {"event": "progress", "step": "extract"}
          on_chain_end("extract_audience")  →  {"event": "result", "node": "audience_data"}
          on_chain_start("generate_persona")→  {"event": "progress", "step": "persona"}
          on_chain_end("generate_persona")  →  {"event": "result", "node": "persona"}
          on_chain_end("LangGraph")         →  {"event": "result", "full": true}
```

## Migration Plan

按依赖关系分期实施：

```
Phase 1: A 类机械清理 + B 类修复（无依赖）
  A1 删除孤儿 pyc
  A2 更新 gitignore
  A3 删除 mock_intent_recognition_agent
  A4 修 hook 路径
  B1 invoke_json 异步化 + call_node_* 异步化
  B2 提取工具函数
  D1 pyproject.toml 修复

Phase 2: C 类架构修复 + 文档（依赖 Phase 1）
  C1 创建 cache_paths.py，解反向依赖
  C3 修正 audience_insight 注册名
  C2 Service 重构（最大项）
  E1 文档同步
```

## Open Questions

无。所有技术决策已在上述 Decisions 中确定。
