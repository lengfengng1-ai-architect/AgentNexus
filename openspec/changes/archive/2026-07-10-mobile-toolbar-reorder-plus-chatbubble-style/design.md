## Context

移动端工作台①对话屏快捷工具栏目前包含 3 个按钮（附件/方案简报模版/一键填充简报），文案和排序需要调整，并扩展为可横向滚动的工具栏以容纳更多入口按钮（产品海报、产品视频等）。同时 ChatBubble 内的"生成方案"按钮在移动端仅复用 PC Tailwind 样式，在 `.mw` 蓝色主题下比例不协调。

## Goals / Non-Goals

**Goals:**
- 工具栏按钮排序：附件上传 → 方案模版 → 方案生成 → 产品海报 → 产品视频
- 文案改名 + "方案生成"纯跳转
- 产品海报/视频按钮填入结构化 prompt 模板到输入框
- ChatBubble 移动端"生成方案"按钮全宽蓝色胶囊

**Non-Goals:**
- 不改动后端 API
- 不改"方案模板"按钮的填充行为
- 不涉及后端 intent recognition 逻辑

## Decisions

### 1. 产品海报/视频用 setInputValue 填充模板

产品海报和视频按钮本质是快捷填入 prompt 模板，用户替换占位后自行发送。这与现有的"方案模板"按钮（handlePrefillTemplate）模式一致。

### 2. ChatBubble 移动端样式选择器

使用 `variant === 'mobile'` 条件分支，在 ChatBubble 内直接切换 className。这延续了之前 InlineImageCard/InlineVideoCard 的 `variant` prop 模式。

## Risks / Trade-offs

- [低] 产品海报/视频的 prompt 模板含 `【】` 占位符，用户需手动替换——这是设计意图，不是风险
