## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: 「关闭自动继续」开关

**Reason**: 强审核点模型下，`interrupt_before` 天然在 `strategy_generation` / `execution_planning` / `plan_generator` 前停下，用户不再需要主动开关"自动继续"。原开关的语义（每个节点完成后暂停）与产品需求错配（用户不需要在每个节点都审核，只在关键决策点审核）。

**Migration**:
- 旧「关闭自动继续 + 每节点后确认」→ 新「三个强审核点，用户在这三处必审」
- 旧「确认继续」按钮 → 新审核面板的「通过」按钮
- 旧「重新执行」按钮 → 新审核面板的「打回」按钮
