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

`/plan` 右侧 SHALL 以垂直时间线形式展示 `plan_generation_pipeline` 的 Agent 执行状态。

#### Scenario: 默认自动继续执行
- **GIVEN** 用户进入 `/plan` 且"自动继续"开关为开启
- **WHEN** 用户点击"开始生成方案"
- **THEN** Agent 节点 SHALL 自动按顺序执行
- **AND** 当前运行节点 SHALL 显示脉冲动画

#### Scenario: 节点失败后阻塞
- **GIVEN** 某个 Agent 节点执行失败
- **WHEN** 系统收到 `node.failed` 事件
- **THEN** 失败节点 SHALL 高亮显示
- **AND** SHALL 显示"重试此步骤""跳过此步骤""终止生成"按钮

#### Scenario: 关闭自动继续
- **GIVEN** 用户关闭"自动继续"开关
- **WHEN** 某个 Agent 节点执行完成
- **THEN** 系统 SHALL 暂停
- **AND** 显示"确认继续"和"重新执行"按钮

### Requirement: `/plan` SHALL 展示实时日志流

`/plan` 页面 SHALL 在流水线区域顶部展示当前执行 Agent 的实时日志信息。

#### Scenario: 节点运行中显示日志
- **WHEN** 系统收到 `node.log` 事件
- **THEN** 日志条 SHALL 显示该 Agent 的当前进度描述
- **AND** 日志文案 SHALL 使用中文、拟人化表达

### Requirement: `/plan` SHALL 渐进式展示生成的方案

当 `plan_generator` 节点开始输出方案内容时，`/plan` SHALL 逐步渲染已生成章节，而不是等待全部完成。

#### Scenario: 生成一章展示一章
- **WHEN** SSE 推送包含第一章内容
- **THEN** 方案预览区 SHALL 显示第一章
- **AND** 后续章节生成完成后 SHALL 依次追加

### Requirement: 方案生成完成后 SHALL 提供后续操作

当所有 Agent 执行完成，`/plan` SHALL 提示用户并展示后续操作选项。

#### Scenario: 方案生成完成
- **WHEN** 系统收到 `workflow.complete` 事件
- **THEN** SHALL 显示"方案初稿已生成"
- **AND** SHALL 提供"查看方案""调整策略""重新生成"按钮

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

## ADDED Requirements

## MODIFIED Requirements

## REMOVED Requirements

## RENAMED Requirements
