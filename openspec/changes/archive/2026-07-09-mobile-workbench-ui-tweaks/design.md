## Context

移动端工作台预览页（MobileWorkbenchPage）已发布，包含 ① 对话入口 ② 简报 ③ 方案生成 ④ 行动建议 ⑤ 下发转达 五个 Tab 屏。本次三项 UI 调整均为发布后修复性优化：

- 导航栏「移动端」按钮当前位于「测试」下拉之前，不符合用户对主功能按钮靠右的习惯
- 对话入口的快捷操作目前仅有一个「填写简报」按钮在输入框左边，其他功能需要通过文字输入或切换屏完成，操作路径长
- 简报底部的 hint 文字占用了按钮区域视觉空间，用户已确认不需要

## Goals / Non-Goals

**Goals:**
- 导航栏按钮顺序优化：移动端移至最右
- 对话入口添加快捷键行：填写简报、语音输入、附件、方案模板四个按钮
- 简报底部去提示文本：AI 生成方案按钮居中

**Non-Goals:**
- 不涉及后端 API 变更
- 不修改 OpenSpec YAML 或数据层
- 不改动移动端其他 Tab 屏的功能逻辑

## Decisions

**快捷键行定位**：放在 `.chat` 气泡区和 `.inputbar` 输入栏之间，作为独立 `flex` 行。行高约 36px，按钮水平排列可横向滚动。

**功能映射**：
- 填写简报 — 复用现有 `onNavigate('brief')` 
- 语音输入 — 复用 ChatInput 中的 `webkitSpeechRecognition` 实现，识别结果填入 `input` state
- 附件 — 触发隐藏 `<input type="file">`，MVP 仅选中文件 + console.log，不上传
- 方案模板 — `setInput('我是 [品牌名]，属于 [品类]...')` 填入预设模板

**样式**：按钮使用 `--surface` 底色 + `--border` 边框的圆角标签，与移动端现有设计语言一致。由于 ScreenChat 完全在手机框内渲染，不涉及窗口 resize 等复杂布局。

**居中策略**：删除 `.hint` div 后，`.dock` 容器将 `justify-content: space-between`（默认 flex-start 被 gap 抵消）改为 `justify-content: center`，使按钮水平居中。

## Risks / Trade-offs

- [低] 语音识别 API 需要 HTTPS 或 localhost 环境，在 HTTP 生产环境不生效 — 移动端预览页为设计展示页，可接受此限制
- [低] 文件选择仅 console.log 不上传，后续接入真实上传需补充
