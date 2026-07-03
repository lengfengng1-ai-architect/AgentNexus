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
