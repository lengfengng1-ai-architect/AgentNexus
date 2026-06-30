# 目录结构规范

> 本文件是整个项目的物理布局定义。目录即契约，新代码必须放入约定位置。

```
AgentNexus/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI 应用入口
│   │   ├── routers/                # 路由层——每个文件对应一个 OpenSpec 路径组
│   │   │   ├── __init__.py
│   │   │   ├── brands.py           # brand-input
│   │   │   ├── data.py             # data-query
│   │   │   ├── fitness.py          # fitness-engine
│   │   │   ├── plans.py            # plan-generation
│   │   │   └── export.py           # document-export
│   │   ├── schemas/                # Pydantic models（从 OpenSpec 生成的代码）
│   │   │   ├── __init__.py
│   │   │   ├── brand.py
│   │   │   ├── platform_data.py
│   │   │   ├── fitness.py
│   │   │   ├── plan.py
│   │   │   └── common.py           # APIError 等共享模型
│   │   ├── services/               # 业务逻辑层
│   │   │   ├── __init__.py
│   │   │   ├── brand_service.py
│   │   │   ├── data_service.py
│   │   │   ├── fitness_service.py
│   │   │   ├── plan_generator.py
│   │   │   └── export_service.py
│   │   ├── prompt_templates/       # LLM prompt 模板文件
│   │   │   ├── plan_chapters/
│   │   │   │   ├── chapter_01.md.j2
│   │   │   │   ├── chapter_02.md.j2
│   │   │   │   └── ...
│   │   │   └── system_prompt.md.j2
│   │   └── config/                 # 配置管理
│   │       ├── __init__.py
│   │       ├── settings.py         # pydantic-settings 加载
│   │       └── fitness_matrix.yaml # 适配度规则矩阵
│   ├── tests/
│   │   ├── conftest.py             # 全局 fixture，mock client
│   │   ├── test_routers/
│   │   │   ├── test_brands.py
│   │   │   ├── test_data.py
│   │   │   ├── test_fitness.py
│   │   │   ├── test_plans.py
│   │   │   └── test_export.py
│   │   └── test_services/
│   │       ├── test_brand_service.py
│   │       ├── test_data_service.py
│   │       ├── test_fitness_service.py
│   │       ├── test_plan_generator.py
│   │       └── test_export_service.py
│   ├── mock_data/                  # MVP 阶段 mock JSON 文件
│   │   ├── cities.json
│   │   ├── sports.json
│   │   ├── leagues.json
│   │   ├── events.json
│   │   ├── influencers.json
│   │   ├── clubs.json
│   │   └── brand_input_sample.json
│   └── pyproject.toml              # 项目依赖（或 requirements.txt）
├── frontend/                       # React 前端（待定）
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── api/
│   └── package.json
├── docs/
│   ├── superpowers.yaml            # 能力边界定义
│   ├── api/
│   │   ├── _template.yaml          # OpenSpec 谱例模板
│   │   ├── brands.yaml
│   │   ├── data.yaml
│   │   ├── fitness.yaml
│   │   ├── plans.yaml
│   │   └── export.yaml
│   └── conventions/                # 本目录——开发规范
│       ├── directory-structure.md
│       ├── testing.md
│       ├── mock-data.md
│       ├── git-workflow.md
│       └── prompt-templates.md
├── .env.example
└── .claude/
    ├── CLAUDE.md                   # AI 开发约束（入口）
    └── settings.local.json
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
