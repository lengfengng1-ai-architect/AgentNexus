## MODIFIED Requirements

### Requirement: 📎附件 — 文件上传+预览

**变更：** 附件上传区从独立区域改为嵌入输入框容器内部。

#### Scenario: 附件预览条嵌入输入行
- **WHEN** 用户选中或拖拽文件到上传区
- **THEN** 附件预览条不再显示在独立的 `rounded-t-2xl bg-mist` 区域
- **AND** 附件卡片嵌入输入框容器内部的 flex-col 布局中，与 textarea 同一背景无分割
- **AND** 图片预览缩小为 32×32，文件 chip 更紧凑

### Requirement: 💬语音 — 浏览器语音识别

无变更。

## ADDED Requirements

### Requirement: 意图识别规则优化 — text_to_image / text_to_video 触发参数卡

修改意图识别 prompt 规则，使用户说"生成宣传片/宣传图"等无具体描述关键词时也能触发对应意图，展示前端参数填写卡片。

#### Scenario: 用户输入"我要生成宣传图"
- **WHEN** 用户输入"我要生成宣传图"或类似表述（无具体图片内容描述）
- **THEN** 意图识别返回 `intent: "text_to_image"`
- **AND** ChatBubble 渲染 InlineImageCard（含图片描述输入框、尺寸选择、生成按钮）
- **AND** AI 回复引导文字："好的！请描述一下您希望生成的图片内容，例如场景、主题风格等，同时可以选择以下参数。"

#### Scenario: 用户输入"我要生成宣传片"
- **WHEN** 用户输入"我要生成宣传片"或类似表述（无具体视频内容描述）
- **THEN** 意图识别返回 `intent: "text_to_video"`
- **AND** ChatBubble 渲染 InlineVideoCard（含 URL 输入、描述输入、参数面板、生成按钮）
- **AND** AI 回复引导文字

#### Scenario: 用户输入"生成图片"且不附带图片要求
- **WHEN** 用户输入"生成图片""帮我生成一张图片"等（无描述）
- **THEN** 意图识别返回 `intent: "text_to_image"`，而非 `chat`
- **AND** 前端展示参数卡供用户填写

### Requirement: InlineImageCard 增加参数选择

InlineImageCard 在无生成结果时展示图片描述输入框和尺寸选择按钮，用户填写后点击生成。

#### Scenario: 参数卡可编辑后生成
- **WHEN** InlineImageCard 在待输入状态
- **THEN** 展示 textarea 输入框（placeholder: "请描述您希望生成的图片内容"）
- **AND** 展示尺寸选择按钮（1:1方图 / 16:9横图 / 9:16竖图）
- **AND** "生成图片"按钮在描述为空时 disabled
- **WHEN** 用户填写描述并点击生成
- **THEN** 请求 POST /api/v1/image/generate 携带 prompt 和 size
- **AND** 成功后显示生成的图片及全屏/复制/重做按钮
