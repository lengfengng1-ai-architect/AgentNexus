---
capability: mobile-workbench-preview
name: 移动端工作台展示页
description: /mobile 移动端工作台展示页，纯白背景居中手机框 + ①-⑤ Tab 切换 5 屏，移动端形态设计参考与可视化预览，样式与 PC 隔离
---

## Purpose

提供 `/mobile` 移动端工作台展示页，在纯白背景上居中显示一个手机界面框架，通过 ①-⑤ Tab 切换 5 屏（对话入口 / 简报 / 方案生成 / 行动建议 / 下发转达成），作为移动端形态的设计参考与可视化预览。样式与 PC 端隔离、自成一套。

## Requirements

### Requirement: 移动端展示页可通过导航入口访问

系统 SHALL 在 PC 端 header 导航栏提供「移动端」入口，点击后跳转到 `/mobile` 路由并渲染移动端展示页。

#### Scenario: 用户从 header 进入移动端页
- **WHEN** 用户点击 header 导航中的「移动端」入口
- **THEN** 浏览器地址栏 SHALL 变为 `/mobile`
- **AND** 页面 SHALL 渲染移动端展示页（非其他页面）
- **AND** 「移动端」入口 SHALL 显示为激活态

#### Scenario: 直接访问 /mobile 路由
- **WHEN** 用户在浏览器地址栏直接打开 `/mobile`
- **THEN** 页面 SHALL 渲染移动端展示页
- **AND** 「移动端」入口 SHALL 显示为激活态

### Requirement: 页面在纯白背景上居中显示手机框架

系统 SHALL 在纯白背景上居中显示一个模拟手机外观的框架（含刘海、状态栏、Home 指示条），周围区域为纯白，突出手机内容。

#### Scenario: 页面加载后的视觉布局
- **WHEN** 移动端展示页加载完成
- **THEN** 页面背景 SHALL 为纯白（`#ffffff`）
- **AND** 一个手机框架 SHALL 水平居中显示
- **AND** 手机框架 SHALL 包含顶部刘海、状态栏、底部 Home 指示条

### Requirement: Tab 切换器在 5 屏之间切换

系统 SHALL 提供一个 Tab 切换器，展示 5 个屏幕标签（① 对话入口 / ② 简报 / ③ 方案生成 / ④ 行动建议 / ⑤ 下发转达成），点击切换手机框架内显示的屏幕内容。

#### Scenario: 默认显示第一屏
- **WHEN** 移动端展示页加载完成
- **THEN** Tab 切换器 SHALL 显示 5 个屏幕标签
- **AND** ① 对话入口 SHALL 为激活态
- **AND** 手机框架内 SHALL 渲染 ① 对话入口屏内容

#### Scenario: P1 阶段未实现的屏幕显示占位
- **WHEN** 用户点击 ②/③/④/⑤ 任一 Tab
- **THEN** 该 Tab SHALL 变为激活态
- **AND** 手机框架内 SHALL 显示「开发中」占位内容（P1 范围，后续变更替换为真实屏）

### Requirement: 对话入口屏支持发送消息

系统 SHALL 在 ① 对话入口屏提供消息输入与发送能力：用户发送消息后，消息出现在对话流，并收到 Agent 自动回复。

#### Scenario: 用户发送一条消息
- **WHEN** 用户在输入框输入文本并点击发送按钮（或按 Enter）
- **THEN** 对话流 SHALL 追加一条用户消息气泡
- **AND** 输入框 SHALL 清空
- **AND** 系统 SHALL 在短延迟后追加一条 Agent 回复气泡

#### Scenario: 空消息不可发送
- **WHEN** 输入框为空时点击发送按钮
- **THEN** 系统 SHALL 不追加任何消息气泡

### Requirement: 对话入口屏支持跳转到简报屏

系统 SHALL 在 ① 对话入口屏的「填写简报」入口（卡片或快捷按钮）被点击时，切换到 ② 简报屏。

#### Scenario: 用户点击填写简报入口
- **WHEN** 用户点击 ① 屏中的「填写简报」入口
- **THEN** Tab 切换器 SHALL 切换到 ② 简报激活态
- **AND** 手机框架内 SHALL 切换到 ② 屏内容（P1 为占位）

### Requirement: 移动端展示页样式与 PC 端隔离

系统 SHALL 使移动端展示页使用独立的 CSS 变量与调色板（蓝色 `#1677ff` 系 + `color-mix` 派生），不引用 PC 端的 `start`/`track`/`line`/`mist` token，且不污染全局 `:root`。

#### Scenario: 样式作用域隔离
- **WHEN** 移动端展示页渲染
- **THEN** 页面内容区 SHALL 使用挂在 `.mw` 作用域下的 CSS 变量
- **AND** 全局 `:root` SHALL 不被新增移动端变量污染
- **AND** PC 端其他页面的样式 SHALL 不受影响

### Requirement: 浏览器后退与前进对路由生效

系统 SHALL 监听浏览器 `popstate` 事件，使后退/前进操作在所有路由（含 `/mobile`）间正确切换页面。

#### Scenario: 从移动端页后退到其他页
- **WHEN** 用户在 `/mobile` 页点击浏览器后退
- **THEN** 页面 SHALL 切换到上一路由对应的页面
- **AND** header 激活态 SHALL 同步更新

#### Scenario: 从其他页前进到移动端页
- **WHEN** 用户在其他页点击浏览器前进到 `/mobile`
- **THEN** 页面 SHALL 渲染移动端展示页
- **AND** 「移动端」入口 SHALL 显示为激活态

## ADDED Requirements

### Requirement: ② 简报屏展示方案头与品牌需求表单

系统 SHALL 在 ② 简报屏展示方案渐变头部 + 品牌需求表单（品牌/品类/产品线/目标人群/营销目标/投放周期/首批城市/核心策略），表单字段预填自设计稿 mock 数据，且所有字段为 controlled state。

#### Scenario: ② 简报屏的视觉布局
- **WHEN** Tab 切换到 ② 简报
- **THEN** 手机框架内 SHALL 渲染渐变方案头（品牌、产品名、产品矩阵标签、规格/价位/周期元数据）
- **AND** 方案头下方 SHALL 显示"方案简报"标题
- **AND** 简报表单 SHALL 显示 8 个字段（品牌/品类/产品线/目标人群/营销目标/投放周期/首批城市/核心策略），每个字段预填设计稿的 mock 数据
- **AND** 吸底显示"✦ AI 生成方案"按钮

#### Scenario: 城市 chips 可点击多选
- **WHEN** 用户点击城市 chip（如"成都"）
- **THEN** chip SHALL 切换选中态（灰色 ↔ 蓝色高亮）
- **AND** 已选城市数组 SHALL 更新
- **WHEN** 用户再次点击已选城市 chip
- **THEN** chip SHALL 取消选中态

#### Scenario: 用户点击 AI 生成方案按钮
- **WHEN** 用户点击吸底"✦ AI 生成方案"按钮
- **THEN** 系统 SHALL 校验品牌字段非空
- **AND** 构造 brand_input（含所有表单字段）
- **AND** Tab 切换器 SHALL 切换到 ③ 方案生成
- **AND** 系统 SHALL 调用 POST /plan/run 启动流水线

### Requirement: ③ 方案生成屏展示 Agent 流水线与方案结果

系统 SHALL 在 ③ 方案生成屏展示 10 步 Agent 流水线状态（含描述短句）+ 可点击展开的操作日志 + 方案内容 + 底部 CTA。

#### Scenario: ③ 方案生成屏的视觉布局
- **WHEN** Tab 切换到 ③ 方案生成
- **THEN** 手机框架内 SHALL 渲染"方案生成"标题
- **AND** 流水线区域 SHALL 显示 10 个 Agent 节点（产品调研、市场调研、人群洞察、数据查询、适配度分析、策略生成、执行规划、预算 KPI、行动建议、方案生成）
- **AND** 每个节点标题下方 SHALL 显示一行描述短句（空闲态为静态文案如"搜索并分析品牌产品信息与市场定位"）
- **AND** 每个节点 SHALL 初始显示 pending 态（灰色）
- **AND** 底部无 CTA（流水线完成前关闭）
- **WHEN** 流水线完成且方案内容可用
- **THEN** 节点区域下方 SHALL 渲染方案内容卡片
- **AND** 底部 SHALL 显示蓝色渐变 CTA「下一步行动建议」

#### Scenario: 点击节点展开/收起操作日志
- **WHEN** 用户点击某个 Agent 节点
- **THEN** 该节点下方 SHALL 滑出操作日志卡片
- **AND** 连接竖线 SHALL 自动跟随高度变化
- **WHEN** 用户再次点击同一节点
- **THEN** 日志卡片 SHALL 收回，竖线恢复原高度
- **WHEN** 当前节点处于 running 态
- **THEN** 该节点 SHALL 自动展开日志卡片

#### Scenario: 描述短句随节点状态变化
- **WHEN** 节点为 pending 态
- **THEN** 描述短句 SHALL 显示静态文案（如"搜索并分析品牌产品信息与市场定位"）
- **WHEN** 节点变为 running 态
- **THEN** 描述短句 SHALL 替换为最新一条操作日志摘要（如"正在用4个关键词并行搜索…"）
- **WHEN** 节点变为 completed 态
- **THEN** 描述短句 SHALL 固定为总结性描述（如"搜索完成，获得12条相关结果"）

#### Scenario: 流水线暂停时显示审核面板
- **WHEN** SSE 收到 workflow.paused 事件
- **THEN** 对应节点 SHALL 显示"等待确认"状态
- **AND** 底部 SHALL 弹出审核弹窗（居中卡片，显示即将执行节点名 + 确认继续/驳回重跑按钮）

### Requirement: ④ 行动建议屏展示筛选互斥与行动采纳

系统 SHALL 在 ④ 行动建议屏展示筛选互斥标签 + 5 条行动 card（海报/赛事/短视频/直播） + 采纳切换 + 下发 CTA。

#### Scenario: ④ 行动建议屏的视觉布局
- **WHEN** Tab 切换到 ④ 行动建议
- **THEN** 手机框架内 SHALL 渲染筛选条（全部/海报/短视频/赛事/直播），"全部"默认高亮
- **AND** 筛选下方 SHALL 渲染 5 条行动 card（品牌悬念海报 / 魅力蓝莓·城市夜跑 / 石榴魅力·瑜伽嘉年华 / 工厂溯源短视频 / 运动达人带货直播）
- **AND** 每条 card 含「采纳」按钮，底部含蓝色渐变 CTA「采纳并下发至 16 盟域」

#### Scenario: 筛选互斥切换
- **WHEN** 用户点击筛选标签（如"赛事"）
- **THEN** 该标签 SHALL 高亮，其他标签取消高亮
- **AND** 行动列表 SHALL 不变（纯展示，数据不筛选过滤）

#### Scenario: 采纳状态切换
- **WHEN** 用户点击某行动 card 的「采纳」按钮
- **THEN** 按钮 SHALL 变为「已采纳」，card 视觉变暗
- **WHEN** 用户再次点击「已采纳」按钮
- **THEN** 按钮 SHALL 恢复为「采纳」，card 恢复正常态

### Requirement: ⑤ 下发转达屏展示 Hero 与转发看板

系统 SHALL 在 ⑤ 下发转达屏展示下发 Hero（含 3 项统计）+ 5 条转发看板 + 转发状态切换 + CTA 再下发。

#### Scenario: ⑤ 下发转达屏的视觉布局
- **WHEN** Tab 切换到 ⑤ 下发转达
- **THEN** 手机框架内 SHALL 渲染黑色渐变 Hero（已下发方案名 + tagline + 3 项统计：4/5 已转发/12.4w 曝光/86% 活跃）
- **AND** Hero 下方 SHALL 渲染"转发达成看板"标题
- **AND** 渲染 5 条转发行（锐动篮球盟·北京 / 羽悦盟·上海 / 城市跑团·广州 / 泳动生活·深圳 / 街球俱乐部·北京），前 4 条"已转发"、末条"未转发"
- **AND** 底部渲染蓝色渐变 CTA「统一发声 · 再下发一条」

#### Scenario: 转发状态可点击切换
- **WHEN** 用户点击某行的转发 pill
- **THEN** pill SHALL 在「已转发」（蓝底白字）和「未转发」（灰底灰字）间切换

### Requirement: ② 简报屏表单为 controlled state 并支持数据提交

系统 SHALL 使 ScreenBrief 中的所有表单字段从 uncontrolled defaultValue 变更为 controlled useState 管理。

#### Scenario: 用户修改表单字段后 state 同步更新
- **WHEN** 用户修改任一表单字段的值
- **THEN** 对应 state SHALL 同步更新
- **AND** 字段的 input/select/textarea SHALL 显示最新值

### Requirement: 核心策略字段支持 AI 优化填写

系统 SHALL 在 ScreenBrief 的核心策略 textarea 旁提供一个 AI 生成图标按钮，点击后调用后端 `POST /plan/strategy-optimize` 端点。

#### Scenario: 用户点击 AI 优化策略按钮
- **WHEN** 用户在简报屏点击核心策略字段旁的 AI 图标按钮
- **THEN** 按钮 SHALL 显示 loading 态
- **AND** 系统 SHALL 调用 `POST /plan/strategy-optimize`
- **AND** 成功后 SHALL 将返回的策略文案填充到核心策略 textarea
- **AND** 失败时 SHALL 显示错误提示

### Requirement: ③ 方案生成屏通过 SSE 事件驱动流水线状态

系统 SHALL 在 ③ 方案生成屏通过 `useMobilePlanRun` hook 消费 SSE 流，动态更新 Agent 节点状态。

#### Scenario: 流水线启动后节点状态逐步更新
- **WHEN** SSE 收到 `node.start` 事件
- **THEN** 对应节点 SHALL 显示 running 态
- **WHEN** SSE 收到 `node.complete` 事件
- **THEN** 对应节点 SHALL 显示 completed 态
- **WHEN** SSE 收到 `node.failed` 事件
- **THEN** 对应节点 SHALL 显示 failed 态，流水线停止

### Requirement: 方案生成完成后展示方案内容

系统 SHALL 在流水线完成后，将 plan_generator 输出的 chapters 渲染为方案内容卡片。

#### Scenario: 方案内容渲染
- **WHEN** SSE 收到 `workflow.complete` 事件且 outputs 包含 plan_generator.chapters
- **THEN** 流水线步骤下方 SHALL 渲染方案内容区域
- **AND** 底部 SHALL 显示渐变 CTA「下一步行动建议」跳转到 ④ 屏
