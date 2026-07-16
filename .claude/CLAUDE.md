# 营销方案 Agent — AI 开发约束

**本项目使用 Claude Code 开发。以下规则 AI 必须遵守，每一条都是强制性的，不可跳过或协商。**

## 1. 核心开发模式

开发模式是：**人写 Spec → AI 填充实现 → 人 Review**。

AI 的职责：按 OpenAPI 3.1 YAML 生成 FastAPI 路由和 Pydantic models；按人写的 Prompt 模板填充变量注入逻辑；实现 CRUD、数据转换、文档生成等标准化代码；编写测试代码。

AI 的禁区（必须等人来做）：定义 API 契约和字段语义；定义业务规则逻辑；编写营销方案 Prompt 的文案策略和风格约束；架构决策；安全审查和最终验收。

**技术栈约束（不可变更）**：后端 API 框架 FastAPI；Agent 实现框架 LangGraph + DeepAgents；Python 依赖管理 uv；AI 不得引入其他 Agent 框架、包管理器或替换该技术选型。

**代码放置规则**：所有文件必须放入 `docs/conventions/directory-structure.md` 定义的目录位置，不要新建顶层目录。

## 2. 接到任何新需求/改动后的强制入口流程

AI 在回复用户之前，必须按以下顺序执行，**不可跳过、不可协商、不可因用户催促而省略**。
回答状态、日志、接口、artifact、QC 或运行结果问题时，必须以当前最新时间点的数据为准：先重新查询代码、日志、数据库或实际 API，再下结论。不能把历史查询结果当作当前状态；如果前后数据发生变化，必须明确说明时间点和变化来源。无法确认时要明确说出不确定性，并继续调研或请求必要信息，禁止凭记忆猜测。

### Step 0 — 加载 Superpowers 约束

Superpowers 是项目使用的一套 Claude Code 插件/技能约束，子技能包括 `brainstorming`、`using-git-worktrees`、`verification-before-completion` 等，部分环境可能以 `/superpowers:<sub-skill>` 形式调用。

当需求可能触发 Step 1-9 流程时，AI 必须在回复开头声明：已检查 Superpowers skill、判断哪些适用、将调用哪个。普通查询可省略声明。

新增/改动类需求的典型触发链：`brainstorming` → `grilling` → `/opsx:explore` → `/opsx:propose`。

### Step 1 — Brainstorming

如果需求涉及新增功能 / 新增 capability / 新增 Agent / 修改现有行为 / 架构决策 / 跨模块改动，**必须**调用 Skill `brainstorming`。未调用即开始设计探索或写代码，视为违反入口流程。

**模式 A（Superpowers brainstorming + OpenSpec）**：
- 调用 `brainstorming` 时须明确告知："本项目采用 OpenSpec 主导流程，请将 design doc 输出到 `docs/superpowers/specs/`，作为 `/opsx:explore` 的输入草稿。"
- `docs/superpowers/specs/` 中的 design doc 是**设计探索草稿**，不是正式 API 契约。
- 正式 OpenSpec 规范必须进入 `openspec/changes/<change-name>/`、`openspec/specs/<capability>/spec.md`、`docs/api/paths/*.yaml`。
- design doc 确认后，AI 主动提出进入 `/opsx:explore <想法>`，由人确认后进入。
- 即使 `brainstorming` skill 内部提示调用 `writing-plans`，也必须拒绝，并坚持进入 `/opsx:explore <想法>`。
- AI 不得在 brainstorming 阶段调用任何实现技能或写任何代码；调用前必须声明："需求属于新增/改动，触发 brainstorming skill。"

### Step 2 — Grilling

如果用户想 stress-test 一个已有计划或设计，调用 Skill `grilling`。顺序可灵活处理：有模糊想法 → 先 brainstorming；有具体方案想被拷问 → 先 grilling；grilling 中发现设计很模糊 → 回到 brainstorming。grilling 结束后，AI 必须在当前对话总结关键结论，并作为 `/opsx:explore` 的输入。

### Step 3 — OpenSpec 探索

brainstorming 或 grilling 的设计结论确认后，必须进入 `/opsx:explore <想法>` 模式，澄清、细化方案，确认无遗留问题后再进入后续流程。

- `/opsx:explore` 用于探索、澄清、细化方案，不写应用代码。
- 它**可以**创建或更新 OpenSpec artifacts（proposal/design/spec/tasks），但这些是**探索草稿**，不是正式变更文档。
- 探索阶段重点是澄清方案、消除歧义，不强制要求产生特定输出。
- `/opsx:propose` 阶段基于 explore 草稿进一步精炼，形成正式变更提案。
- 探索结束后，AI 必须主动提出下一步选项，由人决定是否进入 `/opsx:propose`。

### Step 4 — ponytail 范围审查

回答三个问题并在回复中明确写出：这必须建吗？能用现有能力解决吗？能一行/一个配置解决吗？

### Step 5 — 查询 CodeGraph（必须）

```bash
codegraph explore "营销方案Agent <模块名>"
```

或使用 MCP tool 的 `codegraph_explore`。必须先理解现有的文件结构、已有功能、调用链，确保：不重复写已有的功能、不改坏依赖方、新文件命名与现有规范一致、修改函数签名时同步修改所有调用方。

### Step 6 — 读取项目能力范围（Superpowers Scope）

读取 `docs/superpowers.yaml`，确认要生成的功能在 `in_scope` 内。出现在 `out_scope` 中或不在两栏中的，均提示用户"该功能超出本项目范围，不做实现"。

### Step 7 — 确认 OpenSpec 已存在（必须）

"代码前必须有 OpenSpec 文件记录"，具体包括：`docs/api/paths/*.yaml`（端点契约）、`openspec/changes/<change-name>/*`（proposal/design/spec/tasks）、`openspec/specs/<capability>/spec.md`（主 spec）。

检查 `docs/api/paths/` 下是否有对应 OpenAPI YAML：有 → 按 spec 实现；没有 → **不实现任何代码**，提示用户"请先写 OpenAPI spec"。

### Step 8 — OpenSpec 变更流程

新功能 / 跨端点改动必须走：

```
/opsx:propose <change-name> → /opsx:apply → /opsx:archive
```

- `/opsx:propose`：AI 可生成初始提案、design、spec、tasks 草案，但关键 API 字段语义、业务规则、架构决策必须等人确认。
- `/opsx:apply`：只有人确认 proposal/design/spec 后，才允许写代码。
- `/opsx:archive`：实现完成后归档，同步 delta spec 到主 spec。

### Step 9 — 编码前强制勾选

写任何代码前，必须在回复中显式列出：CodeGraph 查询结果 ✓、项目能力范围确认 ✓、OpenSpec/YAML 已存在 ✓、活跃 opsx change 已确认 ✓。缺一项不得写代码。

### 例外：用户明确要求跳过流程

以上流程为默认强制流程。如果用户明确、具体地要求跳过某一步（如跳过 brainstorming、跳过 `/opsx:explore`、跳过 opsx 流程等），AI 必须：
1. 提醒风险：跳过该步骤可能导致的后果（如缺少设计探索、代码没有 spec 对应、Review 被打回等）。
2. 要求用户再次确认："你确定要跳过 [步骤名] 吗？如果确定，请明确说'确认跳过 [步骤名]'。"
3. 只有用户明确说"确认跳过 [步骤名]"后，才可执行。

如果相关 skill（如 `brainstorming`、`grilling`）不可用，AI 应暂停并报告，不得在未确认的情况下继续。

## 3. OpenSpec 规则（API 契约）

OpenSpec 文件分布：`docs/api/paths/*.yaml`（OpenAPI 端点契约，参考 `docs/api/_template.yaml`）、`openspec/changes/<change-name>/*`（变更级 proposal/design/spec/tasks）、`openspec/specs/<capability>/spec.md`（capability 主 spec）。

AI 在生成 OpenSpec 文档和 OpenAPI YAML 时，必须遵守：
- **文档使用中文编写**：Purpose、Requirements、Scenarios 以及 OpenAPI YAML 的 `summary` / `description` / 字段说明均使用中文。
- 枚举值用英文，注释写中文。
- Pydantic model 的字段名、类型、校验必须与 OpenAPI YAML 完全一致；端点路径必须与 YAML paths 一致；`operationId` 必须与 FastAPI 方法名对应（如 `brand_create` → `async def brand_create()`）。
- 每个字段必须有 description，且内容来自 YAML 的 description。
- 每个端点必须处理 200/400/422/500 响应；错误响应统一用 `APIError` 模型。

## 4. Superpowers 规则（能力边界）

**数据引用规则（最高优先级）**：所有厂商/赛事/达人名称和所有数据数值（人群规模、活动密度、成本参数）必须来自 API 返回或 mock 数据；LLM **禁止**编造上述内容。

**LLM 可以生成的内容**：创意策划内容（赛事名称、活动形式、主题概念、时间线规划）、文案润色与叙事组织、基于已有数据的推理结论。

**LLM 禁止生成的内容**：厂商/赛事/达人名称、数据数值、LLM 自己的 prompt（禁止 Agent 自修改 prompt）。

**out_scope 清单（AI 绝不可生成这些功能的代码）**：方案自动执行、跨平台数据接入、效果归因系统、竞品分析功能、非运动类品牌支持、用户认证系统、支付/订单功能、用户个人隐私数据使用、第三方付费数据接入、未授权的外部平台数据。

## 5. CodeGraph 规则（代码上下文）

每次编码前必须查 CodeGraph，不允许跳过；查到已有功能时直接引用而不是重新实现；修改函数签名时同步修改所有调用方；大型重构后更新 CodeGraph 索引（`codegraph update`）。

## 6. 代码生成规范

- Python 文件用 snake_case，React 组件用 PascalCase，Pydantic model 用 PascalCase，API YAML 用 kebab-case，Mock JSON 用 snake_case。
- 每个模块文件头标注对应的 OpenSpec 路径和 in_scope ID。
- 硬编码的配置值必须提取到配置/环境变量；不要写重复的功能函数。

**ponytail 补充**：不引入未请求的抽象；不加未被要求的依赖；删除优于添加，boring 优于 clever；故意简化处加 `ponytail:` 注释，说明天花板和升级路径；非平凡逻辑必须有一个可运行的最小检查（assert 或小测试）。

### 6b. 测试规则

AI 生成的测试代码必须遵守 `docs/conventions/testing.md`：pytest + pytest-asyncio、tests 目录结构镜像 app 结构、每个端点覆盖 200/400/422/500、覆盖率阈值 80%。

**ponytail 不豁免测试要求**：FastAPI 端点、Agent 入口、Service 公共方法必须有测试；覆盖率必须 ≥80%。可简化的是重复内部工具函数测试、过度 mock、未请求的抽象。

### 6c. Mock 数据规则

MVP 阶段 mock 数据放在 `backend/mock_data/`，遵守 `docs/conventions/mock-data.md`：所有命名字段必须使用真实数据、跨文件 ID 必须可关联、预留切换真实 API 的接口。

### 6d. Git 工作流

开发过程遵守 `docs/conventions/git-workflow.md`：从 develop 分支功能分支 `feat/<id>-<desc>`、squash + merge 回 develop、合并后运行 `codegraph update`。

**AI 分支操作补充**：AI 不得自动切换或创建新分支。如需切分支，必须显式询问用户并获得确认。

### 6e. Prompt 模板

Prompt 模板放在 `backend/app/prompt_templates/`，遵守 `docs/conventions/prompt-templates.md`：使用 Jinja2 禁止字符串拼接、每个模板变量必须有 service 层来源、模板渲染要有测试覆盖。

## 7. 违规后果

如果 Review 发现以下任一情况，代码会被打回重写：

### 输出质量
- 编造了来自 API/mock 之外的数据
- 字段名/类型与 OpenSpec YAML 不一致
- 写了项目已有的重复功能

### 范围合规
- 生成了 out_scope 功能的代码
- 生成了没有 OpenSpec 对应的 API 端点

### 安全
- 硬编码了凭据或配置值

### 流程合规
- 未按 Step 0-9 入口流程执行，具体包括：
  - 涉及新增/改动/架构的需求未调用 `brainstorming`
  - 未进入 `/opsx:explore` 进行方案澄清
  - 未查询 CodeGraph 即开始设计或编码
  - 未读取 `docs/superpowers.yaml` 确认能力范围
  - 无对应 OpenSpec 文件即开始编码
  - 无活跃 opsx change 即开始编码
  - 编码前未显式完成 Step 9 强制勾选

