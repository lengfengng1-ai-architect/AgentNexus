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
│   │   ├── schemas/               # Pydantic models（按 OpenSpec 生成）
│   │   ├── services/              # 业务逻辑层（含 plan 流水线）
│   │   ├── prompt_templates/      # Jinja2 prompt 模板
│   │   ├── utils.py               # 共享工具函数
│   │   └── main.py                # FastAPI 入口
│   ├── data/                      # SQLite 数据库（checkpoints/plan_records）
│   ├── tests/                     # pytest + pytest-asyncio
│   ├── mock_data/                 # MVP 阶段 mock JSON
│   ├── pyproject.toml             # uv 依赖配置
│   └── uv.lock                    # uv lock 文件
├── frontend/                      # React + Vite 前端
│   ├── src/
│   │   ├── pages/                 # PlanPage, PipelineTimeline 等
│   │   ├── hooks/                 # usePlanRun（HMR 状态管理）
│   │   ├── api/                   # API 客户端
│   │   └── components/
│   ├── e2e/                       # Playwright E2E 测试
│   └── package.json
├── docs/
│   ├── api/                       # OpenAPI YAML 文件
│   ├── conventions/               # 开发规范
│   │   ├── directory-structure.md
│   │   ├── testing.md
│   │   ├── mock-data.md
│   │   ├── git-workflow.md
│   │   ├── prompt-templates.md
│   │   ├── agent-registry.md
│   │   ├── agent-framework.md
│   │   └── agent-node-dev-guide.md
│   └── superpowers.yaml           # 能力边界定义
├── openspec/                      # OpenSpec 工作区
│   ├── config.yaml
│   ├── specs/                     # 主 spec 文件
│   └── changes/archive/           # 已归档的 change
├── .claude/
│   ├── CLAUDE.md                  # AI 开发约束（强制）
│   ├── settings.json              # Hook 配置
│   └── hooks/                     # Pre/PostToolUse 脚本
│       ├── check-opsx-change.sh
│       ├── check-mypy.sh
│       └── check-pylint.sh
└── README.md
```

---

## 开发工作流（OpenSpec）

本项目使用 OpenSpec 规范驱动开发。任何功能实现前，必须先有 OpenSpec change。

```
/opsx:explore  <想法/问题>      # 探索阶段：只思考，不写代码
/opsx:propose  <change-name>    # 提案阶段：生成 proposal / design / specs / tasks
/opsx:apply    <change-name>    # 实现阶段：AI 按 tasks 写代码
/opsx:archive  <change-name>    # 归档阶段：sync delta spec，归档 change
```

详细规则见 `.claude/CLAUDE.md`、`docs/conventions/` 系列文档。

---

## AI 开发约束（摘要）

AI 写代码前必须遵守 `.claude/CLAUDE.md` 的全部规则，核心摘要如下：

### 1. 写代码前三步检查

1. **查 CodeGraph**：`codegraph explore "营销方案Agent <模块名>"`
2. **读 Superpowers**：读取 `docs/superpowers.yaml`，确认功能在 `in_scope` 内
3. **确认 OpenSpec**：检查 `docs/api/paths/` 或 `openspec/specs/` 是否有对应 spec

### 2. 能力边界

**可以做的（in_scope）**：品牌需求录入、AllyGo 数据查询、品牌×运动适配度评估、营销方案生成、方案文档导出、市场分析、人群洞察。

**不能做的（out_scope）**：方案自动执行、跨平台数据接入、效果归因系统、竞品分析、非运动类品牌支持、用户认证、支付/订单。

### 3. 数据规则

- 所有厂商/赛事/达人/数据数值必须来自 API 返回或 mock 数据
- LLM **禁止**编造名称和数值
- LLM 可以生成创意策划内容、文案润色、基于数据的推理结论

### 4. 代码规范

- Python 文件：`snake_case`，Pydantic models / React 组件：`PascalCase`
- API YAML：`kebab-case`
- 每个模块文件头标注对应的 OpenSpec 路径和 in_scope ID
- **禁止在函数体内 import**，所有 import 放文件顶部
- **禁止 for 循环建 StateGraph**，所有 add_node/add_edge 逐条显式写出

### 5. 测试规范

- pytest + pytest-asyncio，tests 目录镜像 app 结构
- 每个端点覆盖 200/400/422/500，覆盖率阈值 80%
- **智能测试选择**：只改 Agent 就跑对应 agent 测试，改了 Router 再跑全量

### 6. 代码质量

提交时自动运行（hooks）：
```
mypy app/          # 静态类型检查
pylint app/        # 静态分析（未定义变量、未使用 import）
```

### 7. 依赖管理

- 必须使用 **uv**
- 安装依赖：`uv sync`
- 运行命令：`uv run pytest ...`、`uv run python ...`
- 提交 `uv.lock`

---

## 方案生成工作台说明

### API

| 端点 | 说明 |
|------|------|
| `POST /plan/run` | 启动方案生成（SSE 流式） |
| `POST /plan/runs/{run_id}/approve` | 通过审核检查点 |
| `POST /plan/runs/{run_id}/reject` | 驳回审核检查点 |
| `POST /plan/runs/{run_id}/cancel` | 取消运行 |
| `GET /plan/runs/{run_id}/status` | 查询运行状态与暂停快照 |
| `GET /plan/runs` | 列出最近方案生成批次记录 |

### 状态持久化

- 每次 `start_run` 自动记录到 `data/checkpoints.db`（`plan_records` 表）
- 字段：`run_id`, `brand_input`, `status`, `created_at`, `updated_at`, `current_node`
- 前端 `allygo_plan_run_id` 写入 `localStorage`，刷新页面自动恢复节点状态
- `completed_nodes` 通过 `GET /plan/runs/{run_id}/status` 从 LangGraph 检查点解析

### 审核检查点

方案流水线在以下位置暂停等待人工确认：
1. `strategy_generation` — 策略生成
2. `execution_planning` — 执行规划
3. `plan_generator` — 方案生成

---

## 快速开始

### 后端

```bash
cd backend
uv sync
uv run pytest -v
uv run python -m app.main
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

### 静态分析（提交时自动运行）

```bash
cd backend
uv run mypy app/ --no-error-summary --ignore-missing-imports
uv run pylint app/ --score=n | grep -E 'E[0-9]{4}|W[0-9]{4}'
```
