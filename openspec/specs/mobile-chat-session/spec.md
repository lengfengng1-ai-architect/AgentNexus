---
capability: mobile-chat-session
name: 移动端对话会话
description: 移动端工作台①对话屏的对话会话能力，包含语音输入、快速按钮、消息发送与文件上传
---

## Purpose

提供移动端工作台①对话屏的核心交互能力：用户通过文本或语音输入消息、上传文件、选择快速填充模板，Agent 回复消息并通过 ChatBubble 渲染。

## Requirements

### Requirement: 移动端输入框支持文字输入与发送

系统 SHALL 在 ① 对话屏底部提供输入框、发送按钮，用户可输入文字并通过点击发送或按 Enter 发送消息。

#### Scenario: 用户发送一条文字消息
- **WHEN** 用户在输入框输入文本并点击发送按钮（或按 Enter）
- **THEN** 对话流 SHALL 追加一条用户消息气泡
- **AND** 输入框 SHALL 清空
- **AND** 系统 SHALL 发送消息到后端

### Requirement: 快捷按钮行提供可横向滚动的工具栏入口

系统 SHALL 在输入框上方提供可横向滚动的快捷按钮工具栏，当前按钮为「附件上传」「方案模版」「方案生成」「产品海报」「产品视频」，后续可继续增加。

#### Scenario: 工具栏按钮渲染和排序
- **WHEN** ① 对话屏渲染
- **THEN** 输入框上方 SHALL 显示一行可横向滚动的快捷按钮
- **AND** 按钮行 SHALL 可横向滚动（`overflow-x: auto`）
- **AND** 按钮顺序 SHALL 为「附件上传」「方案模版」「方案生成」「产品海报」「产品视频」

### Requirement: "方案生成"按钮 SHALL 纯跳转到②简报屏

点击"方案生成"时，SHALL 仅切换到②简报屏，不传递任何填充数据。

#### Scenario: 点击方案生成纯跳转
- **WHEN** 用户点击"方案生成"按钮
- **THEN** SHALL 调用 `onNavigate('brief')`
- **AND** SHALL 不传递 inputValue
- **AND** SHALL 不传递 brandData
- **AND** ScreenBrief SHALL 使用默认 mock 数据

### Requirement: "产品海报"按钮填入海报 prompt 模板到输入框

点击"产品海报"时，SHALL 将海报 prompt 模板填入输入框，模板包含产品名、颜色/材质、背景、光线等占位参数。

#### Scenario: 点击产品海报填入模板
- **WHEN** 用户点击"产品海报"按钮
- **THEN** 输入框 SHALL 填入：`帮我生成一张【产品名】的产品海报图片，颜色/材质为【颜色/材质】，背景为【背景】，光线为【光线】`

### Requirement: "产品视频"按钮填入视频 prompt 模板到输入框

点击"产品视频"时，SHALL 将视频 prompt 模板填入输入框，模板包含主体、动作/状态、场景、运镜等占位参数。

#### Scenario: 点击产品视频填入模板
- **WHEN** 用户点击"产品视频"按钮
- **THEN** 输入框 SHALL 填入：`帮我生成一条宣传视频，主体是【主体】，动作/状态是【动作/状态】，场景为【场景】，运镜为【运镜】`

### Requirement: 输入语音按钮 SHALL 从快捷按钮行移至输入框行内

文字版"语音输入"按钮从 `.quick-btns` 中删除，在 `.inputbar-row` 的输入框与发送按钮之间插入圆形 mic 小按钮（SVG 简笔线条图标），点击触发 `handleVoice`。

#### Scenario: 语音按钮迁移布局
- **WHEN** ScreenChat 渲染
- **THEN** `.quick-btns` 中 SHALL 不包含"语音输入"文字按钮
- **AND** `.inputbar-row` 中 input 与 ↑ 之间 SHALL 有一个圆形 mic 按钮
- **AND** mic 按钮 SHALL：宽高 38px、圆形、背景透明（hover 时浅灰）、SVG path 简笔 mic 线条、图标色 `var(--muted)`
- **AND** 点击 mic 按钮 SHALL 触发语音识别（与原先文字按钮行为一致）
