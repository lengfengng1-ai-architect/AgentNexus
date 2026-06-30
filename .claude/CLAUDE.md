# 营销方案 Agent — AI 开发约束

**本项目使用 Claude Code 开发。以下规则 AI 必须遵守，每一条都是强制性的，不可跳过或协商。**

---

## 1. 核心开发模式

开发模式是：**人写 Spec → AI 填充实现 → 人 Review**。

AI 的职责：
- 按 OpenAPI 3.1 YAML 生成对应的 FastAPI 路由和 Pydantic models
- 按人写的 Prompt 模板填充 Prompt 变量注入逻辑
- 实现 CRUD、数据转换、文档生成等标准化代码
- 编写测试代码

AI 的禁区（以下事项必须等人来做）：
- 定义 API 契约和字段语义（人写 OpenSpec）
- 定义业务规则逻辑（适配度规则矩阵内容、成本参数值）
- 编写营销方案 Prompt 的文案策略和风格约束
- 架构决策（技术选型、模块划分、数据流向）
- 安全审查和最终验收

**技术栈约束（不可变更）**：
- 后端 API 框架：FastAPI
- Agent 实现框架：LangGraph + DeepAgents
- Python 依赖管理：uv
- AI 不得引入其他 Agent 框架、包管理器或替换该技术选型

**代码放置规则**：所有文件必须放入 `docs/conventions/directory-structure.md` 定义的目录位置，不要新建顶层目录。

## 2. 写任何代码之前的强制性步骤

在每次写代码或改代码之前，必须依次完成以下三步，缺一不可：

**Step 1 — 查询 CodeGraph（必须）**

```bash
codegraph explore "营销方案Agent <模块名>"
```

或使用 MCP tool 的 `codegraph_explore`。必须先理解现有的文件结构、已有功能、调用链，确保：
- 不重复写已有的功能
- 不改坏依赖方
- 新文件命名与现有规范一致
- 修改函数签名时同步修改所有调用方

**Step 2 — 读取 Superpowers（必须）**

读取 `docs/superpowers.yaml`，确认要生成的功能在 `in_scope` 内。
如果用户要求的功能出现在 `out_scope` 中，必须提示用户"该功能超出本项目范围，不做实现"。
如果用户要求的功能不在 `in_scope` 也不在 `out_scope`，按 `out_scope` 处理（不做）。

**Step 3 — 确认 OpenSpec 已存在（必须）**

检查 `docs/api/paths/` 下是否有对应的 OpenAPI YAML 文件：
- 有 → 按 spec 实现
- 没有 → **不实现任何代码**，提示用户"请先写 OpenAPI spec"

## 3. OpenSpec 规则（API 契约）

所有 OpenSpec 文件放在 `docs/api/` 下，编写前参考 `docs/api/_template.yaml`。

AI 在生成 FastAPI 代码时，必须遵守：

- Pydantic model 的字段名、类型、校验必须与 OpenAPI YAML 完全一致
- 端点路径必须与 YAML paths 一致
- `operationId` 必须与 FastAPI 方法名对应（如 `brand_create` → `async def brand_create()`）
- 每个字段必须有 description，且内容来自 YAML 的 description
- 枚举值用英文，注释写中文
- 每个端点必须处理 200/400/422/500 响应
- 错误响应统一用 `APIError` 模型

## 4. Superpowers 规则（能力边界）

**数据引用规则（最高优先级）：**
- 所有厂商/赛事/达人名称必须来自 API 返回或 mock 数据
- 所有数据数值（人群规模、活动密度、成本参数）必须来自 API 返回或 mock 数据
- LLM **禁止**编造上述内容

**LLM 可以生成的内容：**
- 创意策划内容（赛事名称、活动形式、主题概念、时间线规划）
- 文案润色与叙事组织
- 基于已有数据的推理结论

**LLM 禁止生成的内容：**
- 厂商/赛事/达人名称
- 数据数值
- LLM 自己的 prompt（禁止 Agent 自修改 prompt）

**out_scope 清单（AI 绝不可生成这些功能的代码）：**
- 方案自动执行（创建活动、发送达人邀约）
- 跨平台数据接入（抖音/小红书等）
- 效果归因系统
- 竞品分析功能
- 非运动类品牌支持
- 用户认证系统
- 支付/订单功能
- 用户个人隐私数据使用
- 第三方付费数据接入
- 未授权的外部平台数据

## 5. CodeGraph 规则（代码上下文）

- 每次编码前必须查 CodeGraph，不允许跳过
- CodeGraph 查到已有功能时，直接引用而不是重新实现
- 修改已有函数签名时，必须同步修改所有调用方
- 大型重构后更新 CodeGraph 索引（`codegraph update`）

## 6. 代码生成规范

- Python 文件用 snake_case 命名
- React 组件用 PascalCase 命名
- Pydantic model 用 PascalCase
- API YAML 文件用 kebab-case
- Mock JSON 文件用 snake_case
- 每个模块文件头标注对应的 OpenSpec 路径和 in_scope ID
- 硬编码的配置值必须提取到配置/环境变量
- 不要写重复的功能函数

## 6b. 测试规则

AI 生成的测试代码必须遵守 `docs/conventions/testing.md` 的规范：
- 使用 pytest + pytest-asyncio
- tests 目录结构镜像 app 结构
- 每个端点必须覆盖 200/400/422/500
- 覆盖率阈值 80%

## 6c. Mock 数据规则

MVP 阶段 mock 数据放在 `backend/mock_data/`，遵守 `docs/conventions/mock-data.md`：
- 所有命名字段必须使用真实数据，LLM 不可编造
- 跨文件 ID 必须可关联
- 预留切换真实 API 的接口

## 6d. Git 工作流

开发过程遵守 `docs/conventions/git-workflow.md`：
- 从 develop 分支功能分支 `feat/<id>-<desc>`
- squash + merge 回 develop
- 合并后运行 `codegraph update`

## 6e. Prompt 模板

Prompt 模板放在 `backend/app/prompt_templates/`，遵守 `docs/conventions/prompt-templates.md`：
- 使用 Jinja2，禁止字符串拼接
- 每个模板变量必须有 service 层来源
- 模板渲染要有测试覆盖

## 7. 违规后果

如果 Review 发现以下任一情况，代码会被打回重写：
- 生成了没有 OpenSpec 对应的 API 端点
- 生成了 out_scope 功能的代码
- 编造了来自 API/mock 之外的数据
- 字段名/类型与 OpenSpec YAML 不一致
- 硬编码了凭据或配置值
- 写了项目已有的重复功能
