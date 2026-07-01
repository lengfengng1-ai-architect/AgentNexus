# Git 工作流规范

## 分支策略

```
main              # 稳定发布
  └─ develop      # 日常集成分支
       ├─ feat/<superpowers-id>-<short-desc>   # 新功能
       ├─ fix/<short-desc>                      # 修复
       └─ chore/<short-desc>                    # 工具/配置/杂项
```

| 分支 | 基干 | 生命周期 | 合并方式 | 说明 |
|------|------|----------|----------|------|
| `main` | — | 永久 | 仅从 develop 合并 | 每次合并 = 发布 |
| `develop` | main | 永久 | squash + merge | 日常集成点 |
| `feat/*` | develop | 功能完成即删 | squash + merge | 一个功能一个分支 |
| `fix/*` | develop | 修复完成即删 | squash + merge |  |
| `chore/*` | develop | 完成即删 | squash + merge | 配置文件、依赖更新、文档 |

**AI 分支操作约束**：AI 不得自动切换或创建新分支。如果当前不在合适分支上，必须显式询问用户是否切到新分支，并获得明确确认后方可执行 `git checkout -b` 或 `git checkout`。

## Commit 约定

### 格式

```
<type>: <简短描述>

<可选详细说明>

<可选引用 issue/fix #xxx>
```

### Type

| type | 使用场景 |
|------|----------|
| `feat` | 新功能（对应 OpenSpec 中的某个 operation） |
| `fix` | 修复 bug |
| `refactor` | 重构，不改变行为 |
| `test` | 添加或修改测试 |
| `docs` | 文档（OpenSpec、conventions） |
| `chore` | 工具链/配置/CI |
| `perf` | 性能优化 |

### 示例

```
feat: 添加品牌需求录入端点的 mock data loader

实现 MockDataLoader.load_cities 和 load_sports，
为 brand-input 端点提供 MVP 阶段数据支持。

refs #12
```

## 提交前检查清单

- [ ] 所有测试通过（`pytest -v`）
- [ ] 覆盖率不低于 80%（`pytest --cov`）
- [ ] 新 endpoint 有对应的 OpenSpec YAML
- [ ] 无硬编码凭据或 secret
- [ ] mock 数据中无 LLM 编造的名称
- [ ] 代码格式通过（`ruff` 或等效工具）

## 工作流程

### 开发新功能

```bash
# 1. 从 develop 拉功能分支
git checkout develop && git pull
git checkout -b feat/brand-input-mock-data

# 2. 开发，提交
# ... 写 spec、实现、测试 ...

# 3. 合并回 develop
git checkout develop
git merge --squash feat/brand-input-mock-data
git branch -D feat/brand-input-mock-data
```

### 大型功能

当功能跨越多个 endpoint 时，拆成多个 `feat/*` 子分支逐个合并到 develop，避免一个超大 PR。

## Review 流程

1. 开发者在分支上完成功能后，发起 PR → `develop`
2. Review 者按 CLAUDE.md 第 7 节「违规后果」逐条审查
3. 发现违规 → 标记 blocking，打回重写
4. 通过 → squash + merge 到 develop

## CodeGraph 更新

在合并到 develop 后，如果新增了模块或修改了函数签名：

```bash
codegraph update
```

这一步容易忘，建议在 PR 模板或 CI 钩子中提醒。
