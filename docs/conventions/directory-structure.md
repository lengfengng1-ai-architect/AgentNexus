# 目录结构规范

> 本文件是整个项目的物理布局定义。目录即契约，新代码必须放入约定位置。

```
AgentNexus/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI 应用入口（CORS + 异常处理器 + 路由注册）
│   │   ├── routers/                # API 路由
│   │   │   ├── chat.py             # POST /chat/stream — SSE 聊天
│   │   │   ├── health.py           # GET /health
│   │   │   ├── market_analysis.py  # POST /market-analysis[/stream]
│   │   │   ├── product_info.py     # POST /product-info[/stream]
│   │   │   ├── workflows.py        # 工作流编排 CRUD + 运行
│   │   │   └── audience_insight.py # POST /audience-insight[/stream]
│   │   ├── schemas/                # Pydantic models（按领域分文件）
│   │   │   ├── common.py           # APIError, APIResponse, ErrorCode
│   │   │   ├── chat.py             # BrandInput, ChatResponse
│   │   │   ├── intent.py           # IntentRecognitionOutput
│   │   │   ├── market_analysis.py
│   │   │   ├── plan_generation.py
│   │   │   ├── product_info.py
│   │   │   ├── data_query.py
│   │   │   ├── workflow.py
│   │   │   └── audience_insight.py
│   │   ├── agents/                 # Agent 实现（每个文件一个 agent）
│   │   │   ├── __init__.py         # 导入所有 agent 触发注册，注册 mock handler
│   │   │   ├── registry.py         # register() / register_mock() / get_handler()
│   │   │   ├── orchestrator.py     # 可配置 LangGraph 编排器（支持串行/并行/条件路由）
│   │   │   ├── llm_utils.py        # build_chat_model() — 统一 provider 入口
│   │   │   ├── intent_recognition_agent.py
│   │   │   ├── product_research_agent.py
│   │   │   ├── market_analysis_agent.py
│   │   │   ├── audience_insight_agent.py
│   │   │   ├── fitness_analysis_agent.py
│   │   │   ├── plan_*_agent.py     # market_research, data_query, strategy_generation 等
│   │   │   ├── data_query_agent.py
│   │   │   └── end_reply_agent.py
│   │   ├── services/               # 业务编排层
│   │   │   ├── workflow_service.py        # YAML 加载与校验
│   │   │   ├── workflow_run_service.py    # SSE 流式运行 + 状态缓存
│   │   │   ├── market_analysis_service.py # 市场分析（同步 + 流式）
│   │   │   ├── product_info_service.py
│   │   │   ├── data_provider.py           # Mock 数据加载
│   │   │   └── audience_insight_service.py
│   │   ├── prompt_templates/       # LLM prompt 模板（Jinja2）
│   │   │   ├── intent_recognition.md.j2
│   │   │   ├── product_research.md.j2
│   │   │   ├── market_analysis.md.j2
│   │   │   ├── research_*.md.j2    # 市场研究子节点（7 个）
│   │   │   ├── audience_insight.md.j2
│   │   │   ├── persona_generation.md.j2
│   │   │   ├── strategy_generation.md.j2
│   │   │   └── ...
│   │   └── config/
│   │       └── settings.py         # pydantic-settings 加载
│   ├── workflows/                  # YAML 工作流定义
│   │   ├── chat_pipeline.yaml
│   │   ├── plan_generation_pipeline.yaml
│   │   ├── market_analysis.yaml
│   │   └── audience_insight_pipeline.yaml
│   ├── mock_data/                  # MVP mock JSON 数据（允许子目录）
│   │   ├── product_info/
│   │   ├── market_analysis/
│   │   ├── audience_insight/
│   │   ├── user_persona/
│   │   ├── category_fitness.json
│   │   ├── intent_rules.json
│   │   └── plan_*.json
│   └── pyproject.toml
├── frontend/                       # React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types/
│   └── package.json
├── docs/
│   ├── superpowers.yaml
│   ├── api/
│   │   ├── _template.yaml
│   │   ├── paths/
│   │   │   ├── intent.yaml
│   │   │   ├── market-analysis.yaml
│   │   │   └── workflows.yaml
│   │   └── workflows.yaml
│   ├── conventions/                # 本目录
│   │   ├── directory-structure.md
│   │   ├── testing.md
│   │   ├── mock-data.md
│   │   ├── git-workflow.md
│   │   ├── prompt-templates.md
│   │   ├── agent-registry.md
│   │   └── agent-framework.md
│   └── superpowers/specs/
├── openspec/
│   ├── specs/                      # 主 spec
│   └── changes/                    # 变更文档
└── .claude/
    ├── CLAUDE.md
    └── settings.json
```

## 职责分界

| 层 | 职责 | 依赖 |
|----|------|------|
| `routers/` | 请求/响应序列化、路由注册、输入校验 | 调用 `schemas/` 做序列化，调用 `services/` 做业务 |
| `schemas/` | Pydantic model 定义，与 OpenSpec 一一对应 | 纯数据类，无业务逻辑 |
| `services/` | 核心业务逻辑，编排数据源 | 可调用 mock_data、prompt_templates、外部 API |
| `prompt_templates/` | Jinja2 prompt 模板，变量注入 | services 层加载并填充 |
| `mock_data/` | JSON 静态数据，MVP 阶段使用 | services 层读入，切换真实 API 时替换实现 |

## 原则

- 一个端点文件不超过 400 行
- services 层不感知 HTTP 细节（不 import `Request`/`Response`/`status`）
- routers 层不做业务判断（只做路由、校验、转发）
- tests 目录结构与 backend/app 平行（`test_routers/` 对应 `routers/`，类推）
