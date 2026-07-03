# AllyGo 营销方案 Agent

运动场景 × 品牌营销平台。本项目的核心目标是通过 AI 辅助，为运动类品牌生成可执行、数据可溯源的营销方案。

**开发模式**：人写 Spec → AI 填充实现 → 人 Review。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 API | FastAPI (Python 3.14) |
| Agent 框架 | LangGraph |
| LLM Provider | 阿里百炼（通义千问） / Agnes |
| 依赖管理 | uv |
| 前端 | React + TypeScript + Vite + Tailwind CSS |
| 规范驱动 | OpenSpec |
| 代码索引 | CodeGraph |

---

## 目录结构

```
AgentNexus/
├── backend/                       # FastAPI 后端
│   ├── app/
│   │   ├── agents/                # LangGraph Agent 节点
│   │   ├── config/                # pydantic-settings 配置 + 缓存路径
│   │   ├── routers/               # API 路由层
│   │   ├── schemas/               # Pydantic models
│   │   ├── services/              # 业务逻辑层（含 plan 流水线）
│   │   ├── prompt_templates/      # Jinja2 prompt 模板
│   │   ├── utils.py               # 共享工具函数
│   │   └── main.py                # FastAPI 入口
│   ├── data/                      # SQLite（checkpoints + plan_records）
│   ├── tests/                     # pytest + pytest-asyncio
│   ├── mock_data/                 # MVP 阶段 mock JSON
│   ├── pyproject.toml
│   └── uv.lock
├── frontend/                      # React + Vite 前端
│   ├── src/
│   │   ├── pages/                 # PlanPage, PipelineTimeline
│   │   ├── hooks/                 # usePlanRun（方案流水线状态）
│   │   ├── api/
│   │   └── components/
│   ├── e2e/
│   └── package.json
├── docs/
│   ├── api/                       # OpenAPI YAML
│   ├── conventions/               # 开发规范
│   │   ├── directory-structure.md
│   │   ├── testing.md
│   │   ├── mock-data.md
│   │   ├── git-workflow.md
│   │   ├── prompt-templates.md
│   │   ├── agent-registry.md
│   │   ├── agent-framework.md
│   │   └── agent-node-dev-guide.md
│   └── superpowers.yaml
├── openspec/                      # OpenSpec 工作区
│   ├── config.yaml
│   ├── specs/
│   └── changes/archive/
├── .claude/
│   ├── CLAUDE.md
│   ├── settings.json              # Hook 配置
│   └── hooks/
│       ├── check-opsx-change.sh
│       ├── check-mypy.sh
│       └── check-pylint.sh
└── README.md
```

---

## 开发工作流

```
/opsx:explore  <想法>     → 探索方案
/opsx:propose  <name>     → 生成 proposal/design/spec/tasks
/opsx:apply    <name>     → 按 tasks 写代码
/opsx:archive  <name>     → 归档 change
```

详细见 `.claude/CLAUDE.md` 和 `docs/conventions/`。

## 代码质量

提交时自动运行：
- `mypy app/` — 静态类型检查
- `pylint app/` — 静态分析（未定义变量、未使用 import）

## 方案生成 API

| 端点 | 说明 |
|------|------|
| `POST /plan/run` | 启动方案生成（SSE 流式） |
| `POST /plan/runs/{run_id}/approve` | 通过审核检查点 |
| `POST /plan/runs/{run_id}/reject` | 驳回检查点 |
| `POST /plan/runs/{run_id}/cancel` | 取消运行 |
| `GET /plan/runs/{run_id}/status` | 查询运行状态 |
| `GET /plan/runs` | 列出最近批次记录 |

每次运行记录持久化到 `data/checkpoints.db`（`plan_records` 表）。
前端通过 `localStorage` 保存 `run_id`，刷新页面自动恢复节点状态。

## 快速开始

```bash
cd backend && uv sync && uv run pytest -v
uv run python -m app.main

# 另一个终端
cd frontend && npm install && npm run dev
```
