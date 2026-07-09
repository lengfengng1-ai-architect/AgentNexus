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

系统 SHALL 在 ② 简报屏展示方案渐变头部 + 品牌需求表单（品牌/产品线/目标人群/营销目标/投放周期/首批城市/核心策略），表单字段预填自设计稿 mock 数据。

#### Scenario: ② 简报屏的视觉布局
- **WHEN** Tab 切换到 ② 简报
- **THEN** 手机框架内 SHALL 渲染渐变方案头（品牌、产品名、产品矩阵标签、规格/价位/周期元数据）
- **AND** 方案头下方 SHALL 显示"方案简报"标题
- **AND** 简报表单 SHALL 显示 7 个字段（品牌/产品线/目标人群/营销目标/投放周期/首批城市/核心策略），每个字段预填设计稿的 mock 数据
- **AND** 吸底显示"✦ AI 生成方案"按钮

#### Scenario: 城市 chips 可点击多选
- **WHEN** 用户点击城市 chip（如"成都"）
- **THEN** chip SHALL 切换选中态（灰色 ↔ 蓝色高亮）
- **AND** 已选城市数组 SHALL 更新
- **WHEN** 用户再次点击已选城市 chip
- **THEN** chip SHALL 取消选中态

### Requirement: ③ 方案生成屏展示 Agent 流水线与方案结果

系统 SHALL 在 ③ 方案生成屏展示 5 步 Agent 流水线状态 + 方案结果卡（策略定位、三级赛事体系、核心 KPI） + 下一步 CTA。

#### Scenario: ③ 方案生成屏的视觉布局
- **WHEN** Tab 切换到 ③ 方案生成
- **THEN** 手机框架内 SHALL 渲染"Agent 生成流水线"（5 步：理解需求✓ / 拆解策略✓ / 生成方案◉ / 优化 / 下发盟域）
- **AND** 流水线下方 SHALL 渲染"策略定位"方案 card（含 4M+1C 模型标签）
- **AND** 渲染"三级赛事体系"方案 card（主题赛事 / 联盟赛事 / 跨界活动）
- **AND** 渲染"核心 KPI" row（≥1亿 短视频曝光 / ≥50万 私域会员 / ≥500万 达人 GMV）
- **AND** 底部渲染蓝色渐变 CTA「下一步行动建议」

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
