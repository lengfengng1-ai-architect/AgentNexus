## Why

移动端方案生成后，"生成结果"区域的方案摘要受限于 PhoneFrame 窄框，内容展示不完整。用户在方案生成完成后，需要一个入口查看与工作台一致的完整方案章节内容。

## What Changes

- ScreenGenerate 中"生成结果"标题右侧添加"查看完整方案"按钮
- 新增 ScreenPreview 组件，展示完整的方案章节（与工作台 PlanPreview 一致的折叠式 Markdown 渲染）
- MobileWorkbenchPage 新增 screen key `preview`，将 planRun.chapters 传给 ScreenPreview
- 预览屏顶部栏保留三点导出菜单

## Capabilities

### New Capabilities

- `mobile-plan-preview`: 移动端方案全屏预览，在 PhoneFrame 内以独立 screen 展示完整方案章节

### Modified Capabilities

<!-- 无 — 本次不修改已有 spec 的 requirements -->

## Impact

- 前端 4 个文件改动（ScreenChat.tsx 类型定义、ScreenGenerate.tsx 添加按钮、MobileWorkbenchPage.tsx 路由 + topbar、新建 ScreenPreview.tsx）
- 无后端改动（复用 planRun.chapters 数据）
- 无新增依赖
