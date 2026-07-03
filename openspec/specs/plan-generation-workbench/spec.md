# Capability: plan-generation-workbench

## Purpose

为 AllyGo 营销方案 Agent 提供浏览器端的方案生成工作台 `/plan`，让用户在从 `/chat` 跳转过来后，能实时查看 Agent 流水线执行状态、编辑品牌信息、预览生成的 9 章营销方案，并查看下一步行动建议。

## Requirements

### Requirement: 系统 SHALL 提供 `/plan` 页面

系统 SHALL 提供前端路由 `/plan`，作为方案生成工作台。

#### Scenario: 用户直接访问 `/plan`
- **WHEN** 用户打开 `/plan`
- **THEN** 页面 SHALL 加载方案生成工作台
- **AND** 左侧 SHALL 显示品牌信息表单
- **AND** 右侧 SHALL 显示 Agent 流水线区域

#### Scenario: 从 `/chat` 跳转至 `/plan`
- **GIVEN** 用户在 `/chat` 完成需求录入并点击"生成方案"
- **WHEN** 系统导航到 `/plan?session=<id>`
- **THEN** `/plan` SHALL 从 localStorage 恢复该会话的 `brand_input`
- **AND** 左侧会话摘要 SHALL 显示来源对话的关键信息

### Requirement: `/plan` 左侧 SHALL 展示会话摘要和可编辑表单

`/plan` 页面左侧 SHALL 显示来自 `/chat` 的会话摘要，并提供可编辑的品牌信息表单。

#### Scenario: 显示会话摘要
- **GIVEN** 用户从 `/chat` 跳转过来
- **WHEN** `/plan` 加载完成
- **THEN** 左侧 SHALL 显示品牌名、品类、城市、预算、周期等关键字段
- **AND** SHALL 显示"回到对话"按钮

#### Scenario: 编辑品牌信息
- **WHEN** 用户点击左侧"编辑信息"
- **THEN** 表单 SHALL 展开
- **AND** 用户可以修改品牌信息
- **AND** 修改后点击"重新生成方案"SHALL 触发新的流水线执行

### Requirement: `/plan` 右侧 SHALL 展示 Agent 流水线可视化

`/plan` 右侧 SHALL 以垂直时间线形式展示 `plan_generation_pipeline` 的 Agent 执行状态。流水线运行时 SHALL 自动执行到审核点前停下，无需前端主动 pause。

#### Scenario: 默认执行到审核点自动停
- **WHEN** 用户点击"开始生成方案"
- **THEN** Agent 节点 SHALL 自动按顺序执行
- **AND** 当前运行节点 SHALL 显示脉冲动画
- **AND** 到达 `strategy_generation` / `execution_planning` / `plan_generator` 前 SHALL 自动停下并展示审核面板

#### Scenario: 节点失败进入审核面板
- **GIVEN** 某个 Agent 节点执行失败
- **WHEN** 前端收到 `node.failed` 后紧跟 `workflow.paused` 事件（`reason: "failure"`）
- **THEN** 失败节点 SHALL 高亮显示
- **AND** SHALL 显示审核面板的"通过""改再通过""打回"按钮
- **AND** "通过"按钮 SHALL 默认 disabled（失败继续不安全）

#### Scenario: 审核点面板展示 snapshot
- **GIVEN** run 已在 `strategy_generation` 前暂停
- **WHEN** 前端收到 `workflow.paused` 事件（`reason: "review"`）
- **THEN** 审核面板 SHALL 展示 `snapshot` 中当前节点即将读取的所有字段
- **AND** SHALL 提供 JSON 编辑器供用户修改 patch
- **AND** SHALL 提供"通过"（不改动）/"改再通过"（带 patch）/"打回"（reject）三个按钮

### Requirement: `/plan` SHALL 渐进式展示生成的方案

当 `plan_generator` 节点开始输出方案内容时，`/plan` SHALL 逐步渲染已生成章节，而不是等待全部完成。前端 SHALL 基于新的 `chapter.start` / `chapter.complete` SSE 事件驱动渐进渲染。

#### Scenario: 章节占位卡预铺
- **WHEN** 用户 approve `plan_generator` 前的审核点
- **THEN** 方案预览区 SHALL 立即渲染 9 张章节卡（每张标题来自 `PLAN_CHAPTER_SPEC`）
- **AND** 所有卡片初始状态 SHALL 为 loading 占位

#### Scenario: chapter.start 更新占位状态
- **WHEN** 前端收到 `chapter.start` 事件（含 `chapter_index`）
- **THEN** 对应章节卡 SHALL 从"排队中"切换为"生成中"

#### Scenario: chapter.complete 填充内容
- **WHEN** 前端收到 `chapter.complete` 事件（含 `chapter_index`、`content`）
- **THEN** 对应章节卡 SHALL 展示完整 content
- **AND** 用户 SHALL 能立即滚动阅读已生成章节，不需等其余章节完成

### Requirement: `/plan` SHALL 展示实时日志流

`/plan` 页面 SHALL 在流水线区域顶部展示当前执行 Agent 的实时日志信息。日志来源为 SSE `node.log` 事件；协议不保证 `node.log` 必然到达（服务端可能不发），前端 SHALL 在无 `node.log` 时仅显示节点状态。

#### Scenario: 节点运行中显示日志
- **WHEN** 系统收到 `node.log` 事件
- **THEN** 日志条 SHALL 显示该 Agent 的当前进度描述
- **AND** 日志文案 SHALL 使用中文、拟人化表达

#### Scenario: 未收到 node.log 也不阻塞 UI
- **GIVEN** 某节点执行中未推送任何 `node.log`
- **WHEN** 该节点执行完成
- **THEN** UI SHALL 直接从 `node.start` 状态切换为 `node.complete` 状态
- **AND** 不显示"暂无日志"提示

### Requirement: 方案生成完成后 SHALL 提供后续操作

当所有 Agent 执行完成，`/plan` SHALL 提示用户并展示后续操作选项。

#### Scenario: 方案生成完成
- **WHEN** 系统收到 `workflow.complete` 事件（在 `plan_generator` 之后）
- **THEN** SHALL 显示"方案初稿已生成"
- **AND** SHALL 提供"查看方案""调整策略""重新生成"按钮

#### Scenario: 中途 cancel
- **WHEN** 用户在任意审核点点击"取消"并系统收到 `workflow.cancelled`
- **THEN** SHALL 显示"运行已终止"
- **AND** run_id SHALL 从 URL / localStorage 清除，防止后续误 approve

### Requirement: `/plan` SHALL 展示行动建议

方案生成完成后，`/plan` SHALL 在方案预览下方展示行动建议卡片。

#### Scenario: 显示行动建议
- **GIVEN** 方案已生成完成
- **WHEN** 用户滚动到方案底部
- **THEN** SHALL 显示"创建品牌盟域""发布定制赛事""邀约认证达人"等行动建议卡片
- **AND** 每张卡片 SHALL 显示描述和按钮

#### Scenario: 行动建议按钮不可真正执行
- **WHEN** 用户点击行动建议卡片的按钮
- **THEN** 系统 SHALL 提示"该功能即将上线"或跳转占位页面
- **AND** 不调用任何创建/执行类 API

### Requirement: `/plan` SHALL 适配移动端

`/plan` 页面在移动视口下 SHALL 以单栏布局展示，Agent 流水线垂直折叠。

#### Scenario: 375px 视口
- **WHEN** 视口宽度为 375px
- **THEN** 左侧表单和右侧流水线 SHALL 垂直堆叠
- **AND** Agent 节点默认折叠，点击后展开详情
