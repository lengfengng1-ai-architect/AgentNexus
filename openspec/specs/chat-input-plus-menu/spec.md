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

### Requirement: 📎附件 — 文件上传+预览

功能入口从独立按钮移入 ➕ 菜单。点击后不再展示 URL 输入框，改为文件上传区域（点击选择+拖拽），选中文件后在输入框容器内部上沿展示预览条，发送时自动上传到后端获取 URL。

#### Scenario: 点击📎附件后展开文件上传区
- **WHEN** 用户点击面板中的 📎附件
- **THEN** 面板关闭，输入框容器内部上沿展示文件上传区
- **AND** 上传区支持点击选择文件和拖拽文件
- **AND** ➕ 按钮进入高亮态，表示附件已开启

#### Scenario: 上传附件预览
- **WHEN** 用户选择或拖拽文件到上传区
- **THEN** 在输入框容器内部上沿的预览条中展示附件卡片
- **AND** 图片展示缩略图，非图片展示文件名+后缀

#### Scenario: 关闭附件模式后 ➕ 按钮恢复
- **WHEN** 用户再次点击高亮的 ➕ 按钮，或所有附件被删除后
- **THEN** 附件预览条折叠，➕ 按钮恢复正常态

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

### Requirement: 意图识别 text_to_image / text_to_video 入口

修改意图识别 prompt 规则，使用户说"生成宣传片/宣传图"等无具体描述关键词时也能触发对应意图，展示前端参数填写卡片。

#### Scenario: 用户输入"我要生成宣传图"
- **WHEN** 用户输入"我要生成宣传图"或类似表述（无具体图片内容描述）
- **THEN** 意图识别返回 `intent: "text_to_image"`
- **AND** ChatBubble 渲染 InlineImageCard（含图片描述输入框、尺寸选择、生成按钮）
- **AND** AI 回复引导文字

#### Scenario: 用户输入"我要生成宣传片"
- **WHEN** 用户输入"我要生成宣传片"或类似表述（无具体视频内容描述）
- **THEN** 意图识别返回 `intent: "text_to_video"`
- **AND** ChatBubble 渲染 InlineVideoCard（含 URL 输入、描述输入、参数面板、生成按钮）
- **AND** AI 回复引导文字

### Requirement: InlineImageCard 参数选择

InlineImageCard 在无生成结果时展示图片描述输入框和尺寸选择按钮，用户填写后点击生成。

#### Scenario: 参数卡可编辑后生成
- **WHEN** InlineImageCard 在待输入状态
- **THEN** 展示 textarea 输入框
- **AND** 展示尺寸选择按钮（1:1方图 / 16:9横图 / 9:16竖图）
- **AND** "生成图片"按钮在描述为空时 disabled
- **WHEN** 用户填写描述并点击生成
- **THEN** 请求 POST /api/v1/image/generate 携带 prompt 和 size
- **AND** 成功后显示生成的图片及操作按钮
