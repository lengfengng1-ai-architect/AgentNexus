# AllyGo 营销方案 Agent

运动场景 × 品牌营销平台。本项目的核心目标是通过 AI 辅助，为运动类品牌生成可执行、数据可溯源的营销方案。

**开发模式**：人写 Spec → AI 填充实现 → 人 Review。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 API | FastAPI (Python 3.14) |
| Agent 框架 | LangGraph + DeepAgents |
| 依赖管理 | uv |
| 前端 | React + TypeScript（待定） |
| 规范驱动 | OpenSpec |
| 代码索引 | CodeGraph |

---

## 目录结构

```
AgentNexus/
├── backend/                       # FastAPI 后端
│   ├── app/
│   │   ├── config/                # pydantic-settings 配置
│   │   ├── routers/               # API 路由层
│   │   ├── schemas/               # Pydantic models（按 OpenSpec 生成）
│   │   ├── services/              # 业务逻辑层
│   │   ├── prompt_templates/      # Jinja2 prompt 模板
│   │   └── main.py                # FastAPI 入口
│   ├── tests/                     # pytest + pytest-asyncio
│   ├── mock_data/                 # MVP 阶段 mock JSON
│   ├── pyproject.toml             # uv 依赖配置
│   └── uv.lock                    # uv lock 文件
├── frontend/                      # React 前端（待定）
├── docs/
│   ├── api/                       # OpenAPI YAML 文件
│   │   └── _template.yaml         # OpenSpec 谱例模板
│   ├── conventions/               # 开发规范
│   │   ├── directory-structure.md
│   │   ├── testing.md
│   │   ├── mock-data.md
│   │   ├── git-workflow.md
│   │   └── prompt-templates.md
│   └── superpowers.yaml           # 能力边界定义
├── openspec/                      # OpenSpec 工作区
│   ├── config.yaml                # OpenSpec 项目上下文
│   ├── specs/                     # 主 spec 文件
│   └── changes/                   # 进行中的 change
│       └── archive/               # 已归档的 change
├── .claude/
│   └── CLAUDE.md                  # AI 开发约束（强制）
└── README.md                      # 本文件
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

详细规则见 `.claude/CLAUDE.md` 和 `docs/conventions/git-workflow.md`。

---

## AI 开发约束（摘要）

AI 写代码前必须遵守 `.claude/CLAUDE.md` 的全部规则，核心摘要如下：

### 1. 写代码前三步检查

1. **查 CodeGraph**：`codegraph explore "营销方案Agent <模块名>"`
2. **读 Superpowers**：读取 `docs/superpowers.yaml`，确认功能在 `in_scope` 内
3. **确认 OpenSpec**：检查 `docs/api/paths/` 或 `openspec/specs/` 是否有对应 spec

### 2. 能力边界

**可以做的（in_scope）**：
- 品牌需求录入
- AllyGo 数据查询
- 品牌 × 运动适配度评估
- 营销方案生成
- 方案文档导出

**不能做的（out_scope）**：
- 方案自动执行
- 跨平台数据接入（抖音/小红书等）
- 效果归因系统
- 竞品分析
- 非运动类品牌支持
- 用户认证、支付/订单

### 3. 数据规则

- 所有厂商/赛事/达人/数据数值必须来自 API 返回或 mock 数据
- LLM **禁止**编造名称和数值
- LLM 可以生成创意策划内容、文案润色、基于数据的推理结论

### 4. 代码规范

- Python 文件：`snake_case`
- Pydantic models：`PascalCase`
- React 组件：`PascalCase`
- API YAML：`kebab-case`
- 每个模块文件头标注对应的 OpenSpec 路径和 in_scope ID
- 硬编码配置必须提取到环境变量/配置
- 不要写重复功能函数

### 5. 测试规范

- pytest + pytest-asyncio
- tests 目录镜像 app 结构
- 每个端点必须覆盖 200/400/422/500
- 覆盖率阈值 80%
- 运行命令：`uv run pytest -v`

### 6. 依赖管理

- 必须使用 **uv**
- 安装依赖：`uv sync`
- 运行命令：`uv run pytest ...`、`uv run python ...`
- 提交 `uv.lock`

---

## 如何指导 AI 写一个功能

以"品牌需求录入"为例：

### 步骤 1：进入探索模式

```
/opsx:explore 品牌需求录入 MVP
```

和 AI 讨论：
- 需要哪些字段？（品牌名称、品类、目标城市、预算、周期等）
- 需要哪些端点？（POST /brands, GET /brands/{id}）
- mock 数据怎么组织？
- 第一个简单 Agent 做什么？

### 步骤 2：生成提案

```
/opsx:propose brand-input-mvp
```

AI 会自动生成：
- `proposal.md`：为什么做、做什么
- `design.md`：技术设计、数据流
- `specs/brand-input/spec.md`：需求与场景
- `tasks.md`：可勾选实现步骤

**人必须 Review 这些 artifact**，确认字段、边界、数据规则正确。

### 步骤 3：实现

```
/opsx:apply brand-input-mvp
```

AI 按 tasks 顺序实现：
1. 写 OpenAPI YAML（`docs/api/brands.yaml`）
2. 生成 Pydantic schemas（`app/schemas/brand.py`）
3. 实现 service 层（`app/services/brand_service.py`）
4. 实现 router（`app/routers/brands.py`）
5. 写测试（`tests/test_routers/test_brands.py`）
6. 运行 `uv run pytest -v`

### 步骤 4：归档

```
/opsx:archive brand-input-mvp
```

AI 会把 delta spec sync 到 `openspec/specs/brand-input/spec.md`，然后把 change 归档到 `openspec/changes/archive/`。

---

## 快速开始

```bash
# 1. 进入后端目录
cd backend

# 2. 安装依赖（使用 uv）
uv sync

# 3. 运行测试
uv run pytest -v

# 4. 启动服务
uv run python -m app.main
```

服务启动后访问：
- 健康检查：`GET http://localhost:8000/api/v1/health`
- API 文档：`http://localhost:8000/docs`

---

## 文档索引

| 文档 | 内容 |
|------|------|
| `.claude/CLAUDE.md` | AI 开发约束（强制） |
| `docs/superpowers.yaml` | 能力边界（in_scope / out_scope） |
| `docs/conventions/directory-structure.md` | 目录结构与职责分界 |
| `docs/conventions/testing.md` | 测试规范 |
| `docs/conventions/mock-data.md` | Mock 数据规范 |
| `docs/conventions/git-workflow.md` | Git 分支与提交规范 |
| `docs/conventions/prompt-templates.md` | Prompt 模板规范 |
| `docs/api/_template.yaml` | OpenAPI YAML 谱例模板 |
| `openspec/config.yaml` | OpenSpec 项目上下文 |

---

## 当前状态

已完成：
- 项目骨架（FastAPI + uv + Python 3.14）
- 健康检查端点 `/api/v1/health`
- 测试基础设施
- OpenSpec / CodeGraph / Git 工作流

尚未实现：
- 品牌需求录入（brand-input）
- 数据查询、适配度评估、方案生成、文档导出

下一个推荐功能：**品牌需求录入（brand-input）**。
