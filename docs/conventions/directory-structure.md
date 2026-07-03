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
│   │   │   ├── __init__.py         # 导入所有 agent 触发注册
│   │   │   ├── registry.py         # register() / get_handler() / list_agents()
│   │   │   ├── llm_utils.py        # build_chat_model() + invoke_json() — 统一 provider
│   │   │   ├── utils.py            # 共享工具函数（sanitize / parse_budget / extract_text_from_html）
│   │   │   ├── intent_recognition_agent.py
│   │   │   ├── product_research_agent.py
│   │   │   ├── market_analysis_agent.py
│   │   │   ├── audience_insight_agent.py
│   │   │   ├── fitness_analysis_agent.py
│   │   │   ├── plan_generator_agent.py
│   │   │   ├── data_query_agent.py
│   │   │   ├── end_reply_agent.py
│   │   │   ├── market_research_agent.py
│   │   │   ├── strategy_generation_agent.py
│   │   │   ├── execution_planning_agent.py
│   │   │   ├── budget_kpi_agent.py
│   │   │   ├── action_recommendations_agent.py
│   │   │   └── plan_data_query_agent.py
│   │   ├── services/               # 业务编排层
│   │   │   ├── market_analysis_service.py # 市场分析（同步 + 流式）
│   │   │   ├── product_info_service.py
│   │   │   ├── plan_generation_service.py # Plan pipeline with checkpoint/interrupt
│   │   │   ├── data_provider.py           # Mock 数据加载
│   │   │   └── audience_insight_service.py
│   │   ├── prompt_templates/       # LLM prompt 模板（Jinja2）
│   │   └── config/
│   │       ├── settings.py         # pydantic-settings 加载
│   │       └── cache_paths.py      # Mock 数据目录常量（防止循环依赖）
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
│   │   ├── agent-framework.md
│   │   └── agent-node-dev-guide.md
│   └── superpowers/specs/
├── openspec/
│   ├── config.yaml
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
