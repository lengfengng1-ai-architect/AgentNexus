## Why

移动端工作台预览页发布后，有三处 UI 细节需要调整：导航栏按钮顺序优化、对话入口快捷操作易用性提升、简报区信息精简。三项均为纯前端 UI 调整，无后端改动。

## What Changes

1. **导航栏移动端按钮右移** — 将 App.tsx 导航栏中「移动端」按钮从「测试」下拉之前移到「测试」之后，成为最右侧一级按钮
2. **对话入口添加快捷键行** — 在 ScreenChat 输入框上方添加一行文字快捷按钮（填写简报、语音输入、附件、方案模板），减少操作层级
3. **简报底部去除提示文本** — 删除 ScreenBrief 底部「基于简报自动拆解 4M+1C 策略与执行」提示文字，AI 生成方案按钮居中

## Capabilities

### New Capabilities
<!-- 无新 capability，均为已有 UI 的增量调整 -->

### Modified Capabilities
<!-- 无 spec 级行为变更 -->

## Impact

**涉及前端文件：**
- `frontend/src/App.tsx` — 导航栏按钮顺序调整
- `frontend/src/pages/mobile-workbench/ScreenChat.tsx` — 添加快捷键行 + 语音/文件选择逻辑
- `frontend/src/pages/mobile-workbench/ScreenBrief.tsx` — 删除 hint 元素
- `frontend/src/pages/mobile-workbench/mobile-workbench.css` — 快捷键行样式 + dock 居中

**不影响：后端 API、数据层、测试、OpenSpec YAML、mock 数据**
