## Why

上一轮改动（`2026-07-07-markdown-render-preview`）解决了前端网页中营销方案预览的 Markdown 渲染问题——使用 `marked` 库将 LLM 输出的 Markdown 内容渲染为整洁的 HTML。但**点击「导出 PDF」时，导出的文档中仍然显示原始 Markdown 源码标记**（如 `## 标题`、`**粗体**`、`- 列表项`），而不是渲染后的富文本。

这是因为 `exportPdf()` 函数直接将 `ch.content`（原始 Markdown）写入 PDF 的 HTML，没有经过 `marked.parse()` 转换。而网页端通过 `PlanPreview.tsx` 中的 `marked.parse()` 提前渲染，所以网页显示正常。

## What Changes

- 在 `exportPdf()` 中引入 `marked.parse()` 将章节内容从 Markdown 转换为 HTML 再插入 PDF
- 将 `PlanPreview.tsx` 中已定义的 `.chapter-content` Markdown 渲染样式（标题/列表/表格/引用/代码块等）同步复制到 PDF 内嵌 CSS 中，确保 PDF 渲染质量
- 不需要修改后端，也不涉及 API 或数据变更

## Capabilities

### Modified Capabilities

- `document-export`（方案文档导出）：PDF 导出的 Markdown 内容从源码标记升级为 HTML 渲染，与网页预览一致

## Impact

- 前端：仅修改 `frontend/src/pages/PlanPage.tsx` 中的 `exportPdf()` 函数，单文件变更
- 依赖：`marked` 库已安装（上一轮改动已添加），无需新增依赖
- 测试：更新 `PlanPreview.test.tsx`，补充 PDF 导出相关的基本渲染验证

## Non-goals

- 不重构 PDF 导出架构（当前是 window.open + document.write 的内嵌 HTML 方式）
- 不引入 Puppeteer 或服务端 PDF 生成方案
- 不改动 Word 导出逻辑（已有单独实现，不在本 change 范围）
- 不修改后端任何代码
