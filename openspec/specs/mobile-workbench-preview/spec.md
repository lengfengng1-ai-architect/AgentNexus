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
