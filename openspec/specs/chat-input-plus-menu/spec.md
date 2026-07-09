---
capability: chat-input-plus-menu
name: 聊天输入框"+"聚合菜单
description: 聊天输入框提供"+"聚合菜单收纳附件、方案预填、语音识别等功能入口
tbd: 后续可能根据功能扩展调整菜单内容
---

## Purpose

将聊天输入框的多功能入口收敛到单个"+"聚合菜单中，使界面干净简洁，同时为后续功能扩展预留统一入口。

## Requirements

### Requirement: 聊天输入框"+"聚合菜单

聊天输入框左侧的 📎 附件按钮替换为 ➕ 聚合按钮，点击后弹出浮层面板，收纳所有功能入口。

#### Scenario: 默认状态显示 ➕ 按钮
- **WHEN** 页面加载完成，聊天输入框未被聚焦
- **THEN** 输入框左侧显示 ➕ 按钮（无其他独立功能按钮）

#### Scenario: 点击 ➕ 弹出浮层面板
- **WHEN** 用户点击 ➕ 按钮
- **THEN** 在按钮上方展开浮层面板，包含 5 个功能入口：📎附件、🖼️制图、📋方案、💬语音、📈数据

#### Scenario: 点击面板外部关闭
- **WHEN** 浮层面板已展开，用户点击面板外部区域
- **THEN** 面板关闭，回到默认状态

#### Scenario: 点击功能项后关闭面板
- **WHEN** 用户点击面板中任意功能项
- **THEN** 面板关闭，并执行对应的功能逻辑

### Requirement: 📎附件 — 贴图 URL 输入

功能入口从独立按钮移入 ➕ 菜单，行为与现有逻辑一致。

#### Scenario: 点击📎附件后展开贴图输入
- **WHEN** 用户点击面板中的 📎附件
- **THEN** 面板关闭，textarea 上方展开图片 URL 输入栏（现有 `showAttach` 逻辑）
- **AND** ➕ 按钮进入高亮态（如配色变化），表示贴图附件已开启

#### Scenario: 关闭贴图输入后 ➕ 按钮恢复
- **WHEN** 用户再次点击高亮的 ➕ 按钮，再次点击 📎附件 / 关闭 URL 输入栏
- **THEN** 贴图输入栏折叠，➕ 按钮恢复正常态

### Requirement: 📋方案 — 品牌需求模板预填

点击后预填品牌需求模板到 textarea，自动聚焦，按 Enter 即发送。

#### Scenario: 预填模板内容
- **WHEN** 用户点击 📋方案
- **THEN** textarea 被填入：`我是 [品牌名]，属于 [品类]，想在 [城市] 做活动，预算 [金额] 万，周期 [时长] 个月`
- **AND** textarea 自动聚焦（autoFocus 或 `ref.current.focus()`）
- **AND** 用户按 Enter 时直接发送（不需要额外按发送按钮）

#### Scenario: 用户编辑后再发送
- **WHEN** textarea 已预填模板，用户在发送前编辑了内容
- **AND** 用户按 Enter
- **THEN** 以编辑后的内容发送，而非原始模板

### Requirement: 💬语音 — 浏览器语音识别

调用浏览器原生 SpeechRecognition API，将语音识别为文字后填入 textarea。

#### Scenario: 浏览器支持语音识别
- **WHEN** 用户点击 💬语音
- **THEN** 面板关闭，启动 `webkitSpeechRecognition` / `SpeechRecognition`
- **AND** ➕ 按钮变为 🎤 图标 + 呼吸动画（表示录音中）
- **AND** 语音识别结果持续追加到 textarea 光标位置
- **AND** 用户停止说话（自动静音 3-5 秒）或再次点击 🎤 按钮时停止录音
- **AND** 按钮恢复为 ➕，textarea 中的识别结果保留供用户编辑

#### Scenario: 浏览器不支持语音识别
- **WHEN** 用户点击 💬语音
- **AND** 当前浏览器不支持 `SpeechRecognition` API
- **THEN** 弹出 Toast 提示"当前浏览器不支持语音识别"，按钮不做变化

### Requirement: 🖼️制图 / 📈数据 — 占位按钮

两个功能作为占位入口，点击时提示"功能开发中"。

#### Scenario: 占位按钮提示
- **WHEN** 用户点击 🖼️制图 或 📈数据
- **THEN** 弹出 Toast（或简化提示）"功能开发中，敬请期待"
- **AND** 不做路由跳转或其他任何操作
