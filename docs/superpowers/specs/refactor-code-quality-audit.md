# 全项目代码质量修复 — 设计探索草稿

> 基于 2026-07-03 全项目审查发现的问题。

## 一、修复项分类

按性质分为三类，每类有不同的处理流程：

### A 类 — 机械修复（无需 OpenSpec change，直接 commit）
不会改变任何运行时行为，纯清理。

| # | 项 | 文件 | 操作 |
|---|-----|------|------|
| A1 | 删除孤立 .pyc | `agents/__pycache__/*.cpython-314.pyc` 无源文件的 | 删除 4 个文件 |
| A2 | 更新 .gitignore | 根目录 `.gitignore` | 加 `mock_data/product_info/`、`**/.DS_Store` |
| A3 | 清理 .DS_Store | `openspec/specs/.DS_Store` | 删除并跟踪 |
| A4 | 删除 `mock_intent_recognition_agent.py` | `agents/mock_intent_recognition_agent.py` + `__init__.py` import | 删文件 + 删 import |
| A5 | 修复 `check-opsx-change.sh` 硬编码路径 | `.claude/hooks/check-opsx-change.sh` | 用 `git rev-parse --show-toplevel` 替代硬编码 |

### B 类 — 行为修复（无需 OpenSpec change，但需审慎 review）
修复可能影响运行时行为但**不改变 API 契约**的 bug。

| # | 项 | 文件 | 操作 |
|---|-----|------|------|
| B1 | 同步 `.invoke()` → 异步 `.ainvoke()` | `market_analysis_agent.py` 中 `call_node_*` 函数 + `llm_utils.py` 的 `invoke_json` | 改为 async def + await |
| B2 | 提取重复工具函数 | 多处 `_sanitize`、`_parse_budget`、`_parse_period`、`_extract_text_from_html` | 提取到 `backend/app/utils.py` |

### C 类 — 架构修复（需要 OpenSpec change 或至少 design doc）
改变文件结构和模块间依赖关系。

| # | 项 | 文件 | 操作 |
|---|-----|------|------|
| C1 | 修复 Agent → Service 反向依赖 | `audience_insight_agent.py` import `app.services.audience_insight_service` | 将路径常量移到共享配置模块 |
| C2 | Service 层不重复 Agent 逻辑 | `audience_insight_service.py`、`product_info_service.py`、`market_analysis_service.py` | 改为调用 `get_handler()` + `astream_events` |
| C3 | 修复 Agent 注册名歧义 | `audience_insight_agent.py` `"audience_insight"` 指向 `generate_persona` | 修正注册名或拆分 handler |
| C4 | 修复 pyproject.toml 依赖 | `pyproject.toml` | 见下方明细 |

### D 类 — 文档修复（无需 OpenSpec change，单独 commit）
| # | 项 | 操作 |
|---|-----|------|
| D1 | `docs/conventions/directory-structure.md` 更新 | 去掉已删除文件（orchestrator、workflows router 等） |
| D2 | `docs/conventions/agent-registry.md` 等 | 更新以反映当前架构（非 YAML 编排） |
| D3 | `README.md` 更新 | "未实现"列表过时，更新项目状态 |

## 二、依赖处理顺序

```
A类（机械，无风险）
  │
  ▼
B类（行为修复，但无 API 变更）
  │
  ▼
D类（文档，随时可做）
  │
  ▼
C类 + pyproject.toml
  │
  ▼
C3（注册名修复）
C4（依赖修复）
C1（反向依赖解耦）
C2（Service 重复逻辑合并）
```

B1（同步→异步）会影响所有调用 `invoke_json` 的 agent，需要通读所有调用方并同步改为 `await`。

## 三、OpenSpec change 需求判断

- **A 类全部**：无需 change，clean commit
- **B 类全部**：无需 change，但建议先跑一遍现有测试确认没有回归
- **C 类**：C3（注册名修复）可能影响运行时 agent 解析，建议走一次简短 opsx change
- **pyproject.toml 修复**：依赖变更属于基础配置，不涉及 API 契约或业务逻辑，无需 OpenSpec change，但需要运行 `uv lock` 和 `uv sync` 确认依赖解析成功

## 四、不需要先改 spec 的项

以上所有项均不涉及 API 端点变更、Pydantic schema 字段变更、业务规则变更，因此**不需要先改 OpenAPI YAML 或主 spec**。

唯一的例外是 C2（Service 层重构），其内部变更可能需要对 `openspec/specs/` 中相关 capability 的 service 描述做对照更新，但那也是事后同步。

## 五、推荐执行策略

建议分批提交，每批一个独立的 branch → commit → PR：

```
Batch 1: A 类（机械清理）
  A1(孤立pyc) + A2(gitignore) + A3(.DS_Store) + A5(hook路径)
  → commit "chore: clean up orphaned pyc, gitignore, and hook path"

Batch 2: A4 + B1（mock agent + 异步修复）
  A4(删mock) + B1(invoke→ainvoke)
  → commit "fix: replace sync invoke with async ainvoke, remove dead mock agent"

Batch 3: B2（工具函数提取）
  → commit "refactor: extract duplicate utility functions to shared module"

Batch 4: C4（依赖修复）
  → commit "fix: correct pyproject.toml dependencies"

Batch 5: C1+C3（架构修复）
  → commit "refactor: fix agent-to-service circular dependency and ambiguous registration"

Batch 6: C2（Service 重构，最大项）
  → commit "refactor: delegate agent pipeline to registry handlers from services"

Batch 7: D（文档更新）
  → commit "docs: sync conventions docs and README with current architecture"
```

从当前 `feature-ln` 分支直接 commit（在 develop 上的功能分支），建议合并到 develop 后统一回归测试。
