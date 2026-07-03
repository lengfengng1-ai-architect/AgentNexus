# AllyGo 营销方案 Agent

运动场景 × 品牌营销平台。AI 辅助为运动类品牌生成可执行、数据可溯源的营销方案。

**开发模式**：人写 Spec → AI 填充实现 → 人 Review。

## 开发工作流

本项目使用 OpenSpec 规范驱动开发。

```
/opsx:explore  <想法>     → 探索方案（只思考，不写代码）
/opsx:propose  <name>     → 生成 proposal/design/spec/tasks
/opsx:apply    <name>     → 按 tasks 写代码
/opsx:archive  <name>     → 归档 change（sync delta spec）
```

详细规则见 `.claude/CLAUDE.md` 和 `docs/conventions/`。

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

## 文档索引

### 开发规范（`docs/conventions/`）

| 文件 | 内容 |
|------|------|
| `directory-structure.md` | 目录结构定义，新代码必须放入约定位置 |
| `testing.md` | 测试框架、Mock 策略、覆盖率要求、智能测试选择 |
| `mock-data.md` | MVP 阶段 mock JSON 数据规范 |
| `git-workflow.md` | 分支策略、commit 格式、PR 流程 |
| `prompt-templates.md` | Jinja2 prompt 模板规范 |
| `agent-framework.md` | LangGraph + DeepAgents 技术约束 |
| `agent-registry.md` | Agent 注册表机制 |
| `agent-node-dev-guide.md` | Agent 节点开发手册 |

### AI 开发约束

| 文件 | 内容 |
|------|------|
| `.claude/CLAUDE.md` | AI 必须遵守的 9 步入口流程、代码规范、违规后果 |
| `docs/superpowers.yaml` | 能力边界（in_scope / out_scope） |

### OpenSpec

| 路径 | 内容 |
|------|------|
| `docs/api/paths/*.yaml` | OpenAPI 端点契约 |
| `openspec/specs/<capability>/spec.md` | 能力主 spec |
| `openspec/changes/archive/` | 已归档变更 |

### 方案生成

| 文件 | 内容 |
|------|------|
| `backend/app/services/plan_generation_service.py` | 方案流水线（StateGraph + checkpoint + interrupt） |
| `frontend/src/hooks/usePlanRun.ts` | 前端流水线状态管理 |

---

## 技术栈

FastAPI + LangGraph + React 18 + Vite + uv

## 快速开始

```bash
cd backend && uv sync && uv run pytest -v
uv run python -m app.main
# 另一个终端
cd frontend && npm install && npm run dev
```

## 代码质量

提交时自动运行（`.claude/hooks/`）：
- `mypy` — 静态类型检查
- `pylint` — 未定义变量、未使用 import

## 方案生成 API

| 端点 | 说明 |
|------|------|
| `POST /plan/run` | 启动生成（SSE 流式） |
| `POST /plan/runs/{run_id}/approve` | 通过审核 |
| `POST /plan/runs/{run_id}/reject` | 驳回 |
| `POST /plan/runs/{run_id}/cancel` | 取消 |
| `GET /plan/runs/{run_id}/status` | 运行状态 |
| `GET /plan/runs` | 批次记录 |

每次运行持久化到 `data/checkpoints.db`（`plan_records` 表）。  
前端通过 `localStorage` 保存 `run_id`，刷新页面自动恢复节点状态。
