# AI 驱动开发流程手册（可移植 · 单文件自包含）

> 给「AI 辅助写代码 + 人把关」的项目。把 LLM 纳入工程纪律，而不是放任它生成。
> 本手册自包含全部流程、规范、模板——**给新项目发这一个文件即可**，无需附带其他规范文档。

---

## 0. 解决什么问题

让 AI 写代码时高频出现的：编造数据、字段与契约漂移、重复实现已有功能、越界做不该做的、跳过设计直接编码——靠 **spec-driven 闭环 + 流程门 + 能力边界 + 留痕** 前置挡住，而不是等 Review 才发现。

---

## 1. 核心范式：人写 Spec → AI 填充实现 → 人 Review

| 角色 | 负责 | 禁区 |
|---|---|---|
| **人** | 定义 API 契约与字段语义、业务规则、架构决策、Prompt 文案策略、安全审查、最终验收 | — |
| **AI** | 按契约生成路由/数据模型、按模板填充变量、CRUD/数据转换/文档生成、写测试 | 见 §8 红线 |

技术栈由人**固定**，AI 不得擅自引入新框架/包管理器/替换选型。

---

## 2. 五条不可动摇的骨架

1. **Spec-driven 闭环**：代码前必有 spec（OpenAPI 契约 + 变更记录），spec 是契约先于实现，由工具守护。
2. **单一总纲**：一份 `CLAUDE.md` 统辖所有规则，流程技能与规范都引用它。
3. **能力边界**：独立文件定义 AI「能做 / 不能做」，范围审查的唯一依据。
4. **目录即契约**：物理布局反映职责分层，禁止反向依赖，文件长度/覆盖率有硬阈值。
5. **留痕**：每阶段产出可审查的 artifact（设计草稿、提案、delta spec、任务清单、测试）。

---

## 3. 必备组件（6 个）

| 组件 | 是什么 | 放哪 | 要写什么 |
|---|---|---|---|
| **总纲守则** | AI 必须遵守的强制规则 | `CLAUDE.md`（项目+全局各一份） | 技术栈约束、Step 0-9 入口流程、代码规范、违规后果（见 §12-A 模板） |
| **能力边界** | 范围审查依据 | `superpowers.yaml` | `in_scope`/`out_scope`/`data_boundaries`/`llm_boundaries`（见 §12-B 模板） |
| **Spec 仓库** | 契约与变更记录 | `openspec/` | `specs/`（主 spec，字段语义人定义）+ `changes/`+`archive/`+`config.yaml` |
| **API 契约** | 端点契约 | `docs/api/paths/*.yaml` | OpenAPI 3.1，每个 capability 一文件 + `_template.yaml` |
| **流程技能** | 强制流程不跳步 | Superpowers + opsx:* 技能 | brainstorming / grilling / opsx:explore/propose/apply/sync/archive |
| **代码图谱** | 编码前给上下文 | `.codegraph/` 索引 | 改前查符号/调用链/blast radius，改后更新索引 |

> 规范细则不再单独成文件——**全部集成在本文 §7**，项目里只需一份 `CLAUDE.md`（指向本手册或内嵌）。

---

## 4. 入口流程：每个新需求必走（Step 0-9，强制不跳步）

> 普通查询/答疑可跳过。**新增功能 / 新 capability / 修改现有行为 / 架构决策 / 跨模块改动** 必须走完整 0-9。

| Step | 做什么 | 关键 |
|---|---|---|
| 0 | 回复开头声明「已检查流程技能、判断哪些适用、将调用哪个」 | 触发判断 |
| 1 | **brainstorming**：探索意图与设计，输出 design doc 草稿 | 未调用即设计/编码=违规 |
| 2 | **grilling**（可选）：拷问已有计划 | 顺序灵活，模糊→brainstorming，具体→grilling |
| 3 | **/opsx:explore**：澄清、消除歧义、细化方案 | 可创建探索草稿，不写应用代码 |
| 4 | **范围审查**：必须建？能用现有能力解决？能一行/一个配置解决？ | YAGNI 三问 |
| 5 | **查代码图谱**：理解现状、避免重复/冲突、命名一致 | 改签名前同步所有调用方 |
| 6 | **读能力边界**：确认在 `in_scope`；`out_scope` 或不在两栏→提示不做 | — |
| 7 | **确认 Spec 已存在**：有对应 OpenAPI YAML→按 spec 实现；没有→**不编码**，提示先写 spec | 代码前必有 spec |
| 8 | **变更流程**：propose→apply→archive；关键语义/规则/架构等人确认才写码 | — |
| 9 | **编码前强制勾选**：图谱✓ 能力范围✓ Spec/YAML✓ 活跃 change✓，缺一不码 | 显式列出 |

**例外**：用户明确要求跳过某步时，AI 须先提醒风险、要求用户明确说「确认跳过 [步骤名]」才执行；相关 skill 不可用时暂停报告，不得未确认就继续。

---

## 5. Spec 变更四阶段

```
/opsx:propose <change>   → proposal.md(why/what) + design.md(how) + specs/<cap>/spec.md(delta) + tasks.md
        ↓ （人确认 proposal/design/spec 后才允许写码）
/opsx:apply              → 按 tasks 逐项实现，[ ]→[x]
        ↓
/opsx:sync               → delta spec（ADDED/MODIFIED/REMOVED/RENAMED）智能合并进主 spec
        ↓
/opsx:archive            → 校验完成度 → change 移入 archive/YYYY-MM-DD-<name>/
```

- **proposal**：AI 可生成草案，但关键 API 字段语义、业务规则、架构决策必须等人确认。
- **apply**：实现顺序固定（见 §6），每任务有验收条件，端点必测 200/400/422/500。
- **delta spec 操作**：`## ADDED Requirements` / `## MODIFIED Requirements`（含完整更新内容）/ `## REMOVED`（含 Reason+Migration）/ `## RENAMED`（FROM:/TO:）。每个 Requirement 至少一个 Scenario（WHEN/THEN），用 SHALL/MUST。

---

## 6. 单次编码的实现顺序（固定）

```
OpenAPI YAML (契约)
  → 数据模型/Schema (字段与 YAML 完全一致)
  → 业务层/Service (编排，不感知 HTTP)
  → 接口层/Router (路由+校验，调 service)
  → Prompt 模板 (模板引擎，禁字符串拼接)
  → Mock 数据 (命名字段用真实数据，跨文件 ID 可关联)
  → 测试 (镜像源码结构，覆盖成功+错误码，覆盖率达标)
```

---

## 7. 开发规范（自包含，项目据此执行）

### 7.1 目录结构与分层

- **按职责分层**：接口层（路由+校验）→ 数据模型（Schema）→ 业务层（编排）→ 模板 → mock 数据；另有可插拔节点（agent/handler）目录。
- **严格职责分界**：
  - 接口层不做业务判断，只解析/校验/调业务层/组装响应。
  - 业务层**不 import** HTTP 请求/响应对象（不感知传输层）。
  - 数据模型纯数据无业务逻辑。
- **文件阈值**：单端点/单节点文件 ≤400 行；通用模块 ≤800 行；超阈值就拆。
- **测试目录镜像源码**：`tests/` 结构对应源码（`test_routers/` 对 `routers/`，类推），找测试=找源码。
- **不新建顶层目录**：所有文件放入约定位置。

### 7.2 测试

- **框架固定**（人定），覆盖率硬阈值 **≥80%**。
- **重点测单元**（单 agent / 单 service / 单端点），不测重型编排（除非明确要求）；测真实单元**不 mock 其内部逻辑**。
- **命名**：`test_{function}__{scenario}__{outcome}`（双下划线分段），一眼看出测什么。
- **结构**：AAA 模式（// Arrange / // Act / // Assert 注释）。
- **端点强制覆盖** 200 + 400 + 422（参数校验）；500 推荐。
- **conftest** 提供 async client + mock 数据目录 fixture；**禁止连真实外部服务**。
- **智能选择**：按改动范围（节点/业务/接口/通用）只跑受影响测试，全量套件耗时长。

### 7.3 Mock 数据

- **列表型文件统一 `{data, meta}`**（`meta.total`=数组长度、`meta.source` 标 `manual`/`synthetic`/`api_snapshot`）；配置/映射/字典型文件（如按城市 key 的城市数据、规则映射、预算模板）按需结构，建议标来源/版本。
- **字段 snake_case**，必须与 Schema 字段名**完全一致**；跨文件 ID 必须可关联（不一致会静默返回空，极难排查）。
- **命名字段强制真实数据**（真实实体名/城市/品类），**LLM 不可编造**；数值可合理虚构但须内部一致。
- **通过抽象层访问**（如 `get_data_provider()`），换真实 API 只改抽象层内部，调用方零改动。
- **命名字段变更**需另一人复核（影响面大）；数值调整不需审批但 PR 须注明。

### 7.4 Prompt 模板

- **集中存放**，统一后缀（如 `.md.j2`）；**禁止字符串拼接**，必须模板引擎 `render()`。
- **每文件头标 `Variables:`** 及其来源（哪个 service 字段）；来源不存在须先在 spec 定义。
- **业务规则/映射数据抽到 mock 数据文件**通过变量注入，prompt 不硬编码规则。
- **全局约束**集中在一个 system prompt，各章节模板只写独有内容。
- **每模板必须有测试**：渲染不报错、无 `{{ }}` 残渣、无空占位符。

### 7.5 Git 工作流

- **三级分支**：发布(`main`) ← 集成(`develop`，squash+merge) ← 功能分支(`feat/*/fix*/chore*`，完成即删)。
- **AI 不得自动切/建分支**，必须显式问用户并获确认才能 `git checkout -b`。
- **Commit 格式** `<type>: <描述>`，type：feat/fix/refactor/test/docs/chore/perf/ci。
- **提交前检查清单**：测试通过、覆盖率达标、有对应 spec YAML、无硬编码凭据、mock 无 LLM 编造名称、lint 通过。
- **合并后若改了模块/签名**，必须更新代码图谱索引（PR 模板/CI 应提醒）。

### 7.6 代码生成约定

- **命名**：源码文件 snake_case（或项目约定）；数据模型/组件 PascalCase；API YAML 文件 kebab-case；mock JSON snake_case；`operationId` = `{resource}_{action}`，对应处理函数名。
- **文件头标注**：每个模块文件头注释对应的 spec 路径 + 能力边界 id（便于追溯契约）。
- **配置提取**：硬编码配置值必须提取到配置/环境变量；不写重复功能函数。
- **不引入未请求抽象**；删除优于添加；故意简化处加注释说明天花板与升级路径。
- **非平凡逻辑留一个可运行最小检查**（assert demo 或小测试；不用框架/fixture）；平凡 one-liner 不需测试。
- **不豁免的硬骨头**：信任边界的输入校验、防数据丢失的错误处理、安全、可访问性、真实硬件校准——这些不能图省事。

### 7.7 [可选] AI Agent / 编排框架规范

> 适用于含 LLM agent 编排的项目。非 agent 项目跳过本节。

- **框架固定**：编排框架 + 能力增强层 + 依赖管理器由人定，**禁止其他框架或手写 ReAct/Plan-Execute 循环**。
- **模型构建唯一入口**（如 `build_chat_model()`）：多 provider 在此一处分支；允许节点用 `_build_model()` 作 `@cache` 包装缓存实例，**禁止绕过它自建 provider**。
- **分层架构**：编排（状态图/Service）→ 注册表（可插拔 `register`/`get_handler`）→ 节点（`async run_xxx(state)->dict`）→ 工具层。
- **节点开发规范**：
  - 文件头注释：注册名 + 对应 spec + 能力边界 id + 用途 + 输入/输出。
  - 固定签名 `async def run_<name>(state: dict) -> dict`，返回可序列化 dict。
  - 末尾调 `register()`；在 `__init__.py` import 触发注册。
  - **禁止函数体内 import**（全放顶部）；**禁止 for 循环建图**（add_node/edge 逐条显式）。
  - 节点本身可独立运行测试；进 pipeline 由主流程负责人显式接入（`get_handler` 取用 + `_node_inputs` 定义输入 + `add_node`/`add_edge` 加入图），节点代码不需改。
- **改节点只写自己文件 + 注册，不改主流程**；不在节点里 import 接口/业务层（防循环依赖）。
- **人工审核机制**：checkpoint 持久化 + `interrupt_before` 审核点 + approve/reject/resume/cancel + 流式事件（`workflow.start`/`node.start`/`node.complete`/`workflow.paused`/`workflow.complete`）。
- **真实/mock 分离**：真实节点文件**禁含任何 mock 代码**；mock 放独立 `mock_<name>.py` 用 `register_mock`（前缀 `mock_`）。
- **响应信封**：非流式响应统一 `{success, data, error, meta}`；错误用 `ErrorCode` 常量类，不裸字符串。

---

## 8. AI 行为红线与违规后果

**红线（Code Review 打回）**
- 未走 Step 0-9（未 brainstorming / 未 explore / 未查图谱 / 未读能力边界 / 无 spec 编码 / 无活跃 change 编码 / 未勾选）
- 编造契约/mock 之外的数据（名称/数值）
- 字段名/类型与 spec 不一致
- 重复实现已有功能
- 生成 out_scope 功能 / 无 spec 对应的端点
- 硬编码凭据/配置值
- 自动切/建分支（必须问用户）
- 函数体内 import、循环建图、字符串拼 prompt、无测试提交、真实节点含 mock 代码

**违规后果分类**：输出质量（编造数据/字段不一致/重复）· 范围合规（out_scope/无 spec 端点）· 安全（硬编码凭据）· 流程合规（未走 0-9）—— 一律打回重写。

---

## 9. 能力边界机制详解（最重要的一条纪律）

**数据引用最高优先级**：所有实体名称（厂商/产品/地点等）和所有数据数值（规模/密度/成本）必须来自 API 返回或 mock；**LLM 禁止编造**。

| LLM 可以生成 | LLM 禁止生成 |
|---|---|
| 创意策划（活动名称/形式/主题/时间线） | 实体名称（必须来自 API/mock） |
| 文案润色与叙事组织 | 数据数值 |
| 基于已有数据的推理结论 | LLM 自己的 prompt（禁 Agent 自修改 prompt） |

**遇冲突怎么处理**（用户要 LLM 做禁区）：AI **不默从**，指出与哪条规则冲突，给两条合规路径让用户选——
- **路径 A 改边界**：人修订能力边界文件放行（这是人的特权），AI 起草修订措辞 + 必要护栏，人确认。
- **路径 B 走 mock/规则**：守住边界，用 mock 来源或固定规则实现。

**护栏示例**：若放行「LLM 分配某类数值」，强制加代码护栏（如和=100%、单项上下限、引用数据为依据、校验失败回退 mock），确保最坏情况数值仍有合规来源。

---

## 10. Spec 与文档规则

- **文档用项目工作语言写**（如中文）：Purpose/Requirements/Scenarios 及 API 的 summary/description/字段说明。
- **枚举值用英文**，注释写工作语言；代码标识符/变量名/`operationId` 保持英文。
- 数据模型字段名/类型/校验与 OpenAPI YAML **完全一致**；端点路径与 YAML paths 一致；`operationId` 与处理函数名对应。
- **每字段必有 description**；每端点处理 200/400/422/500，错误响应统一用 `APIError` 模型。
- 每个 spec 对应一个能力边界 id；一 change 对应一个能力，不跨功能。

---

## 11. docs 组织与维护（防文档腐烂）

### 11.1 目录该这样组织

| 子目录/文件 | 放什么 | 有用性 | 维护 |
|---|---|---|---|
| `CLAUDE.md` | 总纲守则 | 持续有用 | 随流程/栈变化更新 |
| `conventions/` 或本手册 §7 | 开发规范 | 持续有用 | 随代码演进更新 |
| `api/` | OpenAPI 契约 + 模板 | 持续有用（契约） | 随端点变化更新 |
| `references/` | 外部 API/服务对接参考、能力级专项手册 | 持续有用 | 外部变更时更新 |
| `superpowers.yaml`（能力边界） | in/out_scope | 持续有用 | 范围决策变化时更新 |
| 根 `*.md` | 跨切指南/设计模式 | 持续有用 | — |
| `design/` 或 `superpowers/specs/` | brainstorming 设计草稿 | 过程留痕 | 做完归档/定期清理 |
| `plans/` | 实现计划草稿 | 过程留痕 | 同上 |

### 11.2 有用性判断

一句话：**「半年后还要查它吗？」** 要→持续有用（规范/契约/边界/指南/参考）；不要→过程留痕（草稿/计划）。

### 11.3 维护原则

1. **单一事实源**：代码行为的事实源是「代码 + spec」，docs 只写「约束、契约、决策、为什么」，**不复述代码细节**（否则一改代码文档就过期）。
2. **规范随代码更新**：改了约定必须同步规范。
3. **草稿带日期 + 定期清理**：过程草稿命名 `YYYY-MM-DD-<topic>.md`，做完的定期归档或删除。
4. **草稿标注非事实源**：开头标「探索阶段结论，非正式 spec」。
5. **能力级专项手册不混通用规范**：某个能力的对接步骤放 `references/`，`conventions/`（或本手册 §7）只放跨能力通用规范。

---

## 12. 新项目搭建 10 步

1. **装工具**：OpenSpec CLI、代码图谱工具、流程技能集（Superpowers 或等价）、依赖管理器。
2. **建目录骨架**：按 §7.1 分层建源码目录 + mock 数据目录 + 测试目录（镜像源码）+ `docs/` + `openspec/`。
3. **放本手册**：把本文件作为项目的开发规范源（`docs/development-workflow-guide.md`），或拆成 `conventions/` 若干份。
4. **写总纲 `CLAUDE.md`**：照 §13-A 模板，填技术栈 + Step 0-9 + 指向本手册 + 违规后果。
5. **写能力边界 `superpowers.yaml`**：照 §13-B，列 in_scope/out_scope/data·llm boundaries。
6. **初始化 OpenSpec**：`openspec init` + 写 `config.yaml`（context+rules，见 §13-C）+ 建 API `_template.yaml`（含反向引用能力边界 id + 共享错误模型 + 标准错误响应）。
7. **建代码图谱索引**：首次索引，后续 file watcher 自动维护。
8. **装流程技能**：brainstorming/grilling + opsx:explore/propose/apply/sync/archive，用锁文件锁定来源+哈希。
9. **如果是 agent 项目**：照 §7.7 搭编排框架 + 注册表 + 模型统一入口。
10. **跑通一个 dry-run change**：从 propose 到 archive 走一遍，验证流程门都生效（无 spec 编码被拦、勾选强制、归档同步）。

---

## 13. 可抄模板

### A. `CLAUDE.md` 总纲骨架

```markdown
# [项目名] — AI 开发约束

本项目使用 AI 编码助手开发。以下规则 AI 必须遵守，每条强制，不可跳过或协商。

## 1. 核心开发模式
人写 Spec → AI 填充实现 → 人 Review。
AI 职责：按 OpenAPI 生成路由与数据模型；按模板填充变量；实现 CRUD/转换/文档；写测试。
AI 禁区（等人做）：定义契约与字段语义；定义业务规则；写 Prompt 文案策略；架构决策；安全审查；最终验收。
技术栈约束（不可变更）：[你的固定栈]。AI 不得引入其他框架/包管理器/替换选型。
代码放置规则：所有文件放入约定目录位置，不新建顶层目录。
开发规范：见 docs/development-workflow-guide.md §7（或拆成 conventions/）。

## 2. 接到新需求/改动后的强制入口流程
（照本手册 §4 的 Step 0-9 抄入，含例外条款）

## 3. Spec 规则（契约）
（照本手册 §10 抄入）

## 4. 能力边界规则
（数据引用最高优先级 + LLM 可/不可生成表 + 冲突处理，照 §9 抄入）

## 5. 代码图谱规则
每次编码前必查图谱；查到已有功能直接引用；改签名同步调用方；大型重构后更新索引。

## 6. 代码生成 / 测试 / Mock / Git / Prompt 规范
（照本手册 §7 各节抄入；Git 加「AI 不得自动切/建分支」）

## 7. 违规后果
（照本手册 §8 抄入）
```

### B. `superpowers.yaml` 能力边界骨架

```yaml
version: "v0.1"
platform:
  name: "[项目名]"
  description: "[一句话定位]"
capabilities:
  in_scope:
    - id: "[capability-id]"
      name: "[能力名]"
      description: "[能力描述]"
      constraints: |
        [如：数据必须来自 API/mock，LLM 不可编造名称/数值]
  out_scope:
    - id: "[capability-id]"
      name: "[能力名]"
      reason: "[为什么不做]"
data_boundaries:
  can_use: ["[允许的数据源]"]
  cannot_use: ["[禁止的数据源，如用户隐私/第三方付费/未授权外部]"]
llm_boundaries:
  can_generate: ["创意策划", "文案润色", "基于数据的推理结论"]
  cannot_generate: ["实体名称", "数据数值", "LLM 自己的 prompt"]
```

### C. `openspec/config.yaml` 骨架

```yaml
context: |
  Tech stack: [你的栈]
  Domain: [你的领域]
  Naming: [命名约定]
  Out of scope (AI 绝不可实现): [清单]
rules:
  proposal:
    - 必须引用对应能力边界的 in_scope id
    - 每个 change 对应一个能力，不跨功能
    - 必须说明 mock 数据如何覆盖
    - 涉及 out_scope 必须在 Non-goals 列出
  design:
    - 接口设计必须声明对应 OpenAPI 文件
    - 数据流必须标明 mock 还是真实 API
    - 命名引用必须来自 mock，不可 LLM 编造
    - Agent/编排必须基于固定框架
  specs:
    - 每个 spec 对应一个能力边界 id
    - 字段语义由人定义，AI 不可修改
    - 枚举英文，注释工作语言
  tasks:
    - [实现顺序与验收规则]
schema: spec-driven
```

---

## 14. 设计取舍（为什么这样搭）

- **spec-driven 而非直接让 AI 写**：编造/漂移/重复是高频问题；spec 把契约前置 + 流程门挡住。
- **能力边界独立成文件**：业务范围会变，但「AI 能做哪些」是策略，要单独可审查，不混代码。
- **强制代码图谱**：AI 不读代码就改会重复实现/改坏调用方；图谱让一次查询拿到源码 + blast radius。
- **真实/mock 分离 + 单一模型入口**：节点独立开发测试、主流程零改动集成；换真实 API 只改一处。
- **AI 不自动切分支**：版本控制高风险操作，由人决策。
- **Step 0-9 强制 + 违规打回**：把 Code Review 常见问题前置成可核对的清单，把纪律落到流程里而非靠自觉。
- **规范单文件自包含**：避免规范散落多文件导致的不一致与腐烂；一手册在手，全项目有据可依。

---

---

## 附录 B：项目文档生成脚本（给 LLM 的初始化指令）

> 把本手册 + 下方指令 + 项目信息发给 LLM，它会为你的新项目生成全套开发文档——包括像 `agent-framework.md` 那样带架构图与代码示例的具体规范。

### 指令（粘贴给 LLM）

```
你是新项目「<项目名>」的开发规范搭建者。基于上方《AI 驱动开发流程手册》，为该项目生成全套开发文档。

【步骤 0：先探测技术栈，再生成——绝不臆测】
1. 读项目依赖文件确定实际栈：
   - Python：pyproject.toml / requirements.txt（看 [tool.uv] / poetry 配置 / 依赖列表）
   - Node：package.json（看 packageManager 字段 / lock 文件）
   - Go / Rust / Java：go.mod / Cargo.toml / pom.xml
2. 必须探测的维度：语言、依赖管理器、Web 框架、Agent 编排库（若有）、模型接入方式、测试框架、前端框架、持久化、流式方式。
3. 探测不到的字段 → **问用户，不猜**。

常见选项参考（探测到哪个写哪个，别臆测）：
| 维度 | 常见选项 |
|---|---|
| 依赖管理 | uv / poetry / pip / pnpm / npm / yarn / cargo / go mod |
| Web 框架 | FastAPI / Django / Flask / Next.js / Express / NestJS / Gin |
| Agent 编排 | LangGraph / LangChain / AutoGen / LlamaIndex / 手写循环 |
| 模型接入 | 探测现有统一入口函数名（如 build_chat_model）；没有则在新规范里定义一个，别让各节点自建 |
| 测试 | pytest / vitest / jest / go test |
| 持久化/checkpoint | SQLite / Postgres / Redis |
| 流式 | SSE / WebSocket |

【项目信息（探测 + 问用户后填实，不留占位）】
- 技术栈：<探测到的实际栈，如「Python + uv + FastAPI + LangGraph + pytest」「React + Vite + pnpm + vitest」>
- 领域：<一句话>
- 能力清单 in_scope：<列出>
- 不做 out_scope：<列出>
- 是否含 AI agent 编排：<据依赖判断，如依赖了 langgraph 则是>

要生成的文档（逐份输出完整内容，放对应路径）：

【根与配置】
1. CLAUDE.md — 总纲。照手册 §13-A，填项目栈 + Step 0-9（照 §4）+ 指向本手册 + 违规后果（§8）。
2. superpowers.yaml — 能力边界。照 §13-B，填项目 in_scope/out_scope/data·llm boundaries。
3. openspec/config.yaml — 照 §13-C，填 context + 四类 rules。
4. docs/api/_template.yaml — OpenAPI 模板：每个 property 中文 description + x-in-scope-ref 反向引用 superpowers id + 共享 APIError 模型 + 200/400/422/500 标准响应。

【docs/conventions/ 通用规范 — 每份展开为完整可执行文档，照手册 §7 对应节，用项目实际栈】
5. directory-structure.md（§7.1）：职责分层图 + 每层职责分界 + 文件组织树 + 文件阈值 + 测试镜像规则。
6. testing.md（§7.2）：框架 + 覆盖率阈值 + 命名约定（双下划线 test_{fn}__{scenario}__{outcome}）+ AAA 模式 + 端点错误码覆盖 + conftest fixture 示例。
7. mock-data.md（§7.3）：{data,meta} 结构示例 + 真实命名字段规则 + 跨文件 ID 一致性 + 抽象层接口（如 get_data_provider() 示例）。
8. prompt-templates.md（§7.4）：模板引擎用法 + Variables: 注释块格式 + 规则抽到 mock 的示例 + 模板测试要求。
9. git-workflow.md（§7.5）：三级分支模型 + 「AI 不得自动切/建分支」+ commit 格式 + 提交前检查清单。

【docs/conventions/agent-* — 仅 agent 项目，照 §7.7，要像 agent-framework.md 那样具体含架构图与代码示例】
10. agent-framework.md：
    - 强制技术栈（项目实际编排框架 + 版本 + 依赖管理器；禁止其他框架/手写 ReAct/Plan-Execute 循环）
    - 架构分层图（接口层 → 编排状态图 → 注册表 → 节点 → Mock 层 → 模型层）
    - 可插拔注册模式（register() / get_handler() 代码示例）
    - Agent 文件头注释模板（注册名 / 对应 spec / 能力边界 id / 用途 / 输入 / 输出）
    - 模型构建统一入口（唯一函数，多 provider 一处分支；禁止各节点自建模型）
    - Pipeline 定义（状态图代码即配置；并行 fan-in 示例：START → 多节点 → 汇总节点 → END）
    - 人工审核机制（checkpointer 持久化 + interrupt_before + approve/reject/resume/cancel + service 层方法签名）
    - SSE 流式事件清单（workflow.start/node.start/node.complete/node.log/workflow.paused/workflow.complete 等）+ 三行帧格式（id/event/data）
    - 响应信封（{success,data,error,meta} + ErrorCode 常量类，非裸字符串）
    - 文件组织树（agents/services/prompt_templates/schemas 各放什么）
    - 测试要求（mock 模型层、不调真实 API、provider 分支集中在一处测）
11. agent-node-dev-guide.md：节点开发手册（开发前三步：查 spec/查能力边界/查图谱 + 文件标准结构 + 固定签名 + 注册 + 禁止事项表）。
12. agent-registry.md：注册底座（register + __init__ import 触发注册 + mock 独立文件 mock_ 前缀 + 禁止改编排/循环依赖/返回非 dict/不注册写测试）。

【生成规则】
- 用项目实际技术栈（框架名/路径/语言），不抄手册占位。
- 每条规则可执行：具体到代码模式/路径/阈值/命名，非空话。
- 含代码示例/架构图/模板（agent-framework.md 必须有分层图 + 注册示例 + 文件头模板 + 信封结构）。
- 能力边界 id 与 spec 一一对应。
- 不复述代码细节（单一事实源是代码 + spec），只写约束/契约/模式/为什么。

【生成顺序】CLAUDE.md → superpowers.yaml → openspec/config.yaml → _template.yaml → conventions/ 各份 → 跑一个 dry-run change 验证流程门。

【验收】AI 拿到这套文档能按 Step 0-9 工作；每份文档独立可读、可执行、可审查。
```

---

---

## 附录 C：convention 原文范本（某真实 Python/FastAPI/LangGraph 项目）

> 以下是某真实项目的 8 份 convention 原文，作为**结构与具体度**的参考范本——展示一份合格的 convention 应该写到多具体（架构图、代码示例、表格、禁止事项）。附录 B 的生成脚本会据此结构生成适配你项目实际栈的版本；移植时把路径（如 `backend/app/`）、框架（LangGraph）、依赖管理（uv）换成你的实际选择。

### C.1 directory-structure.md

````markdown
# 目录结构规范

> 本文件是整个项目的物理布局定义。目录即契约，新代码必须放入约定位置。

[省略 ASCII 目录树：backend/app/{routers,schemas,agents,services,prompt_templates,config} + mock_data/ + frontend + docs + openspec + .claude]

## 职责分界

| 层 | 职责 | 依赖 |
|----|------|------|
| `routers/` | 请求/响应序列化、路由注册、输入校验 | 调用 `schemas/` 做序列化，调用 `services/` 做业务 |
| `schemas/` | 数据模型定义，与 OpenSpec 一一对应 | 纯数据类，无业务逻辑 |
| `services/` | 核心业务逻辑，编排数据源 | 可调用 mock_data、prompt_templates、外部 API |
| `prompt_templates/` | Jinja2 prompt 模板，变量注入 | services 层加载并填充 |
| `mock_data/` | JSON 静态数据，MVP 阶段使用 | services 层读入，切换真实 API 时替换实现 |

## 原则

- 一个端点文件不超过 400 行
- services 层不感知 HTTP 细节（不 import `Request`/`Response`/`status`）
- routers 层不做业务判断（只做路由、校验、转发）
- tests 目录结构与源码平行（`test_routers/` 对应 `routers/`，类推）
````

### C.2 git-workflow.md

````markdown
# Git 工作流规范

## 分支策略

main（稳定发布） ← develop（日常集成，squash+merge） ← feat/*/fix*/chore*（完成即删）

**AI 分支操作约束**：AI 不得自动切换或创建新分支。如果当前不在合适分支上，必须显式询问用户是否切到新分支，并获得明确确认后方可执行 `git checkout -b` 或 `git checkout`。

## Commit 约定

格式：`<type>: <简短描述>` + 可选详细说明 + 可选引用 issue。

| type | 使用场景 |
|------|----------|
| `feat` | 新功能（对应 OpenSpec 中的某个 operation） |
| `fix` | 修复 bug |
| `refactor` | 重构，不改变行为 |
| `test` | 添加或修改测试 |
| `docs` | 文档（OpenSpec、conventions） |
| `chore` | 工具链/配置/CI |
| `perf` | 性能优化 |

## 提交前检查清单

- [ ] 所有测试通过
- [ ] 覆盖率不低于 80%
- [ ] 新 endpoint 有对应的 OpenSpec YAML
- [ ] 无硬编码凭据或 secret
- [ ] mock 数据中无 LLM 编造的名称
- [ ] 代码格式通过（lint）

## Review 流程

1. 开发者在分支上完成功能后，发起 PR → develop
2. Review 者按违规后果逐条审查
3. 发现违规 → 标记 blocking，打回重写
4. 通过 → squash + merge 到 develop

## 代码图谱更新

合并到 develop 后，如果新增了模块或修改了函数签名，必须更新代码图谱索引（建议在 PR 模板或 CI 钩子中提醒）。
````

### C.3 testing.md

````markdown
# 测试规范

## 框架

| 场景 | 框架 |
|------|------|
| 单元测试 | pytest + pytest-asyncio |
| HTTP 测试 | httpx.AsyncClient |
| mock | unittest.mock / pytest-mock |
| 覆盖率 | pytest-cov，阈值 80% |

## 范围

- **测试重点是单 Agent/单节点**——每个独立测试
- **不测试 Pipeline/工作流编排**，除非用户明确要求（测试代价高且收益低）
- 覆盖率阈值 ≥80%

## 目录结构

tests 镜像源码：test_agents/（单 Agent）、test_routers/（端点）、test_services/（Service）、test_plan_generation/（流水线）。

## AAA 模式

每个测试必须遵循 Arrange-Act-Assert，并用注释标三段。

## 命名

```
test_{function}__{scenario}__{outcome}
```

示例：`test_brand_create__valid_input__returns_brand_with_id`

## 每个端点必须覆盖

| 状态码 | 场景 | 要求 |
|--------|------|------|
| 200/201 | 正常输入 | 强制 |
| 400 | 缺必填字段/格式错误 | 强制 |
| 422 | 类型错误/枚举越界 | 强制 |
| 500 | 内部错误/下游异常 | 推荐 |

## conftest 约定

必须提供 fixture：`client`（async HTTP client，自动加载 mock 数据）、`mock_data_dir`（指向 mock 数据目录）。**禁止连真实外部服务**。

## Mock 策略

测试真实 agent 时**不要做 mock**——agent 本身的逻辑（字段提取、条件分支、错误处理）必须被真实覆盖。Mock 只在为独立 Mock Agent 编写测试时使用。

## 智能测试选择

全量测试耗时长，改代码后只跑受影响的：改 Agent 内部→只测该 agent；改 Service→该 service + 依赖它的 router；改通用模块→所有引用方；不确定→先评估波及面。
````

### C.4 mock-data.md

````markdown
# Mock 数据规范

## 存放位置

所有 mock 数据在 `mock_data/`，按功能模块组织子目录。

## JSON 格式约定

**列表型文件**必须是 `{data, meta}`；配置/字典型按需结构（建议标 source/版本）：

```json
{
  "data": [ ... ],
  "meta": {
    "total": 12,
    "last_updated": "2026-06-01",
    "source": "manual",
    "version": "v0.1"
  }
}
```

- `data` — 数组，每条记录是一个完整对象
- `meta.total` — **必须等于** `data.length`
- `meta.source` — `manual`（人工构造）/ `synthetic`（代码生成）/ `api_snapshot`（真实 API 快照）
- 字段名 snake_case，必须与 schema 字段名一致

## 数据质量要求

**命名字段（强制）**：所有名称必须使用真实数据（真实城市/赛事/品类），**LLM 不可编造** mock 中不存在的名称。

**数值字段**：可合理虚构，但必须内部一致（如参与人数不超过该城市该运动的目标人群规模）。

**关联一致性**：跨文件 ID 必须可关联（cities.json 的 id="shanghai" ↔ events.json 的 city_id="shanghai"）。不一致会导致 service 层关联查询静默返回空，调试困难。

## 与 service 层的接口

数据提供者抽象在 `data_provider.py`，通过 `get_data_provider()` 获取。切换真实 API 时替换内部实现即可，调用方零改动。

## 审批

命名字段变更需另一成员复核（防止编造数据混入）；数值调整不需审批但 PR 须注明。
````

### C.5 prompt-templates.md

````markdown
# Prompt 模板系统规范

## 存放位置

所有 prompt 模板集中在 `prompt_templates/`，后缀 `.md.j2`（Markdown 格式 Jinja2 模板）。

## 文件头注释

每个模板文件头部必须包含标准注释块，说明变量来源：

```jinja2
{#
  Variables:
    - message: str — 用户最新输入（来源：chat router）
    - context.brand_input: dict — 已确认品牌字段（来源：chat 上下文）
    - context.conversation_history: list[str] — 对话历史
#}
```

## 业务数据与 Prompt 分离

Prompt 中的**提取规则 / 映射数据**应提取到 mock 数据 JSON 文件，通过 Jinja2 变量传入，不要在 prompt 里硬编码。模板渲染方负责加载 JSON 并传给模板变量，模板只使用变量但不定义规则细节。

## 变量注入（禁止字符串拼接）

```python
# ✅ 正确：Jinja2 渲染
template = env.get_template("plan_chapters/chapter_01.md.j2")
prompt = template.render(brand_name="Nike", city_data=city_summary, ...)

# ❌ 错误：字符串拼接
prompt = f"品牌名称：{brand_name}\n运动品类：{sport_type}..."
```

## 全局约束

`system_prompt.md.j2` 中统一声明（角色定义、数据引用规则禁止编造、输出格式、章节结构约束），各章节模板只写该章独有内容，不重复。

## 变量来源映射

每个模板变量必须有明确的 service 层来源（如 `brand_name → brand_service.get_brand_input()`）。如果变量来源在 schema 或 service 中不存在，必须先在 OpenSpec 中定义。

## 测试

每个模板必须有对应测试，验证：1) 模板渲染不报错（变量齐全）；2) 渲染结果不出现 `{{` `}}` 残渣；3) 渲染结果不含空占位符（如 `""`、`null` 字符串）。
````

### C.6 agent-framework.md

````markdown
# Agent 框架规范

## 强制技术栈

- Agent 编排：[固定编排框架，如 LangGraph ≥1.0]——所有状态流转、节点编排、持久化/流式/人机协同的载体
- Agent 能力增强：[可选增强层，如 DeepAgents ≥0.6]——在编排框架之上按需使用
- 模型初始化：**统一通过 `build_chat_model()`**；`_build_model()` 作 `@cache` 包装允许，禁止绕过它自建 provider
- 依赖管理：[固定工具，如 uv]

**禁止引入其他 Agent 框架，或在编排框架之外手写完整的 ReAct/Plan-and-Execute 等循环。**

## 架构分层

```text
┌─────────────────────────────────────────┐
│  Application / Router / Service         │
├─────────────────────────────────────────┤
│  StateGraph Pipeline                    │  代码定义节点和边
│  - 直接调 get_handler(agent_name)      │
├─────────────────────────────────────────┤
│  Registry                               │  可插拔注册 register/get_handler
├─────────────────────────────────────────┤
│  Agent 节点层                           │  async run_xxx(state)->dict
│  - 内部使用 build_chat_model()          │  不含 mock 代码
├─────────────────────────────────────────┤
│  Mock Agent 层                          │  独立文件，mock_ 开头
├─────────────────────────────────────────┤
│  模型层                                 │  build_chat_model() 统一 provider 适配
└─────────────────────────────────────────┘
```

核心原则：Agent 通过 registry.register() 注册，不依赖硬编码路由；pipeline 用 StateGraph 在代码中定义，不经 YAML 配置层；真实 Agent 文件禁止任何 mock 代码；build_chat_model() 是唯一模型入口。

## Agent 文件头注释规范

```python
"""Agent: <能力名称>。

注册名称: <registry 名称>
对应 OpenSpec: docs/api/paths/<xxx>.yaml
对应 in_scope ID: <superpowers.yaml ID>
用途: <一句话描述>
输入: <需要的 state 字段>
输出: <返回的 schema>
"""
```

## 模型构建统一入口

```python
from app.agents.llm_utils import build_chat_model

model = build_chat_model()
structured_llm = build_chat_model().with_structured_output(MySchema)
```

不需要在每个 agent 文件里复制 provider 分支。

## 可插拔注册模式

```python
from app.agents.registry import register

async def run_my_agent(state: dict) -> dict:
    ...

register("my_agent", run_my_agent)
```

Mock handler 放独立文件 `mock_<name>.py`，用 `register_mock` 注册。

## Pipeline 定义（代码即配置）

并行→汇总示例（官网推荐模式）：

```python
graph = StateGraph(ResearchState)
graph.add_node("web", search_web)
graph.add_node("news", search_news)
graph.add_node("summary", summarize)
graph.add_edge(START, "web")
graph.add_edge(START, "news")     # 并行
graph.add_edge("web", "summary")
graph.add_edge("news", "summary") # fan-in：两者都完成后执行 summary
graph.add_edge("summary", END)
pipeline = graph.compile()
```

**禁止 for 循环建图**——所有 add_node/add_edge 逐条显式写出。

## Checkpointer 与人工审核检查点

- AsyncSqliteSaver：SQLite 持久化 checkpoint，MVP 零运维。
- `interrupt_before`：compile 时声明执行前必须停下的节点。
- 恢复：Command(resume={}) 从 checkpoint 继续。
- 编辑再通过：approve 前把 edited_input 写入 channel_values。
- 驳回重跑：reject 注入 _reject_reason，Command(resume={}) 重新执行当前节点。
- 取消：adelete_thread(run_id) 删除 checkpoint。

Service 层暴露：start_run / approve_run(edited_input) / reject_run(reason) / delete_run / get_status / run_exists。

## SSE 流式事件

每帧标准三行（id/event/data）。事件类型：`workflow.start`、`node.start`、`node.complete`、`node.log`、`node.failed`、`workflow.paused`、`chapter.start`、`chapter.complete`、`workflow.complete`、`workflow.canceled`。

## 响应信封（非流式端点）

```json
{ "success": true, "data": {...}, "error": null, "meta": null }
```

错误：`{ "success": false, "data": null, "error": {"detail":"...","code":"error_code","errors":null} }`。错误码通过 ErrorCode 常量类引用，避免字符串拼写错误。

## 测试

Agent 测试必须 mock 模型层，不能调真实 API；推荐 mock 图入口或直接调 mock_run_* 函数；provider 分支集中在一处测（如 test_llm_utils.py）；覆盖率 ≥80%。
````

### C.7 agent-node-dev-guide.md

````markdown
# Agent 节点开发手册

> 给负责具体 Agent 能力开发的工程师。你的职责：实现一个可被主流程编排的节点，不是写整个系统/前端/路由/主流程。

## 1. 职责范围

你负责：在 agents/ 下新增 Agent 文件；设计输入/输出 schema；写 Jinja2 prompt 模板；用 build_chat_model() 调 LLM；通过 registry.register() 注册；可选注册 mock handler；写单元测试。

你不负责：路由；自己写 _build_model()（统一用 build_chat_model）；主流程编排；架构决策/技术选型/新增依赖。

## 2. 开发前必须做

- Step 1 确认 OpenSpec 已存在：检查 docs/api/paths/ 有对应 YAML。**没 spec 不写代码**。
- Step 2 确认在能力边界内：读 superpowers.yaml，out_scope 停止，不在两栏按 out_scope 处理。
- Step 3 查代码图谱：每次编码前查，避免重复/冲突/改坏调用方。

## 3. Agent 文件标准结构

```python
"""Agent: <能力名称>。

注册名称: <registry 名称>
对应 OpenSpec: docs/api/paths/<xxx>.yaml
对应 in_scope ID: <superpowers.yaml ID>
用途: <一句话>
输入: <需要的 state 字段>
输出: <返回的 schema>
"""

from app.agents.registry import register
from app.agents.llm_utils import build_chat_model


async def run_<agent>(state: dict) -> dict:
    input_val = state.get("input_field")
    if not input_val:
        raise ValueError("Missing required input: input_field")
    llm = build_chat_model().with_structured_output(<AgentOutput>)
    result = await llm.ainvoke([...])
    return result.model_dump()


register("<agent>", run_<agent>)
```

关键约定：

| 项 | 约定 |
|----|------|
| 文件头注释 | 必须含 注册名称/对应 OpenSpec/对应 in_scope ID/用途/输入/输出 |
| 文件命名 | `<agent_name>_agent.py`，snake_case |
| schema 文件 | `schemas/<domain>.py`，PascalCase |
| prompt 文件 | `prompt_templates/<agent_name>.md.j2` |
| 入口函数 | `async def run_<agent_name>(state: dict) -> dict` |
| 模型构建 | **必须基于 build_chat_model()**（_build_model() @cache 包装允许，禁绕过自建 provider） |
| import 规则 | **禁止函数体内 import**，全部放顶部 |
| 图构建 | **禁止 for 循环建图**，add_node/add_edge 逐条显式 |

## 4. 何时用增强层（DeepAgents 等）

增强层是**可选能力层**，不是默认选择。只有需要以下时才在节点内部用：自动任务规划（todo list）、虚拟文件系统、子 Agent 委派、人机协同（interrupt_on）、已验证兼容的 response_format。

禁止：用 create_deep_agent 一句话替代整个编排图；在增强层里做跨节点状态流转；在增强层里维护持久化状态。

## 5. 测试

每个 Agent 必须配 `tests/test_agents/test_<agent_name>_agent.py`。原则：推荐 mock 模型层保证 CI 稳定；也可调真实 LLM 做本地验证（但只在 .env 配好且网络可达时）；推荐 mock 图入口或具体节点函数；多 provider 分支分别测；覆盖率 80%。

最小模板：mock _graph.ainvoke 返回结构化输出 → 调 run_<agent> → 断言字段。

## 6. 单独验证

方式一：写临时脚本 `scripts/debug_<agent>.py`，调 run_<agent> 打印结果。
方式二：pytest 跑真实输入但 mock 掉图。

## 7. 禁止事项（Code Review 打回）

| 禁止 | 正确做法 |
|------|---------|
| 用过时社区版模型 | init_chat_model + 官方包 |
| StateGraph(total=False) 状态松散 | Pydantic BaseModel / TypedDict 严格 |
| 手写 markdown 剥离 | with_structured_output(Schema) |
| 自己读 .env 建 model | build_chat_model() |
| 字符串拼 prompt | Jinja2 模板 |
| create_deep_agent 包整个 Agent | 编排图 + 增强层作为节点 |
| 没测试就提交 | 覆盖率 ≥80% |
| 没 OpenSpec 就写代码 | 先补 spec |
| 编造名称/数值 | 全部来自 API/mock |
| for 循环建 add_node/add_edge | 逐条显式 |
| 函数体内 import | 全部放顶部 |

## 8. 提交前自检清单

- [ ] 文件在 `agents/<agent_name>_agent.py`
- [ ] 文件头含 6 个必填注释字段
- [ ] schema 在 `schemas/<domain>.py`、prompt 在 `<agent_name>.md.j2`
- [ ] 实现 `async def run_<agent>(...) -> OutputSchema`
- [ ] 用 build_chat_model() 不自建
- [ ] 输出是 Pydantic model 非裸字符串
- [ ] 有 OpenAPI spec、在 in_scope 内
- [ ] 有测试，覆盖率 ≥80%
- [ ] 没用增强层包全场、没编造数据

## 9. 与主流程协作

开发前同步能力范围/输入输出/是否需持久化；开发中保持入口稳定；开发完提供示例调用；联调时主流程把你的 Agent 作为节点加入，**不要自己改主流程**。

目标：**节点本身可独立运行测试；拼进主流程时不需要改你的代码。**
````

### C.8 agent-registry.md

````markdown
# Agent 注册与编排底座规范

> Agent 节点开发者只需关心第 1-2 节。

## 1. 你负责什么

**只写自己的 Agent 文件，不改主流程代码。**

必须做：
1. 在 `agents/` 下新建 `your_name_agent.py`
2. 实现异步入口 `async def run_your_name(state: dict) -> dict`
3. 在自己模块里调 `registry.register("your_name", run_your_name)`
4. 调 LLM 用 `build_chat_model()`，不自己写 _build_model()
5. 在 `agents/__init__.py` 中 import 你的模块（触发注册）
6. 写测试 `tests/test_agents/test_your_name_agent.py`

Mock Agent（可选）：**必须独立文件**，以 `mock_` 开头（`mock_your_name.py`），用 `registry.register_mock` 注册。**真实 Agent 文件禁止包含 mock 代码**（use_mock_data/_MOCK_PATH/_load_mock）。

入口函数签名：

```python
async def run_your_name(state: dict) -> dict:
    """state 含 input/outputs/status 等字段，按 input_mapping 注入。
    Returns: dict，合并到 state.outputs[节点ID]。"""
    ...
```

最小示例：

```python
"""Agent: market_research。
对应 OpenSpec: docs/api/paths/market_research.yaml
对应 in_scope ID: market-research
"""
from app.agents.registry import register
from app.agents.llm_utils import build_chat_model

async def run_market_research(state: dict) -> dict:
    brand_input = state.get("brand_input")
    llm = build_chat_model()
    return {"target_city": brand_input.get("city"), "insights": [...]}

register("market_research", run_market_research)
```

然后在 `agents/__init__.py` 加：`from app.agents import market_research_agent  # noqa: F401`

## 2. 主流程怎么调度你

主流程通过 `_build_node(node_id)` 用 `get_handler(node_id)` 从 registry 取出 handler，包装成 LangGraph 节点执行。

但节点**不会自动进 pipeline**——主流程是**显式编排**：`_node_inputs()` 按节点 id 用 if 分支定义该节点输入，`graph.add_node` / `add_edge` 逐条显式把节点加进图。新 Agent 要进 pipeline，**由主流程负责人显式接入**（加 `_node_inputs` 分支 + `add_node` / `add_edge`）；节点开发者只写自己的 agent 文件 + `register`，不改编排代码。

## 3. 禁止事项

| 禁止 | 原因 | 正确做法 |
|------|------|---------|
| 在主流程外改编排 | 破坏可插拔 | registry.register 注册 |
| 在 Agent 里 import routers/services | 循环依赖 | 只暴露 run_xxx(state) |
| 返回非 dict/不可序列化 | state 需可序列化 | 返回 dict 或 model.dict() |
| 不注册就写测试 | 找不到 handler | 先 register 再 import 测试 |
````

> 本手册是方法论骨架。各项目按自身技术栈填 §13 模板、用附录 B 脚本生成全套规范，但「spec-driven 闭环 + 流程门 + 能力边界 + 目录即契约 + 留痕」这套骨架不变。
