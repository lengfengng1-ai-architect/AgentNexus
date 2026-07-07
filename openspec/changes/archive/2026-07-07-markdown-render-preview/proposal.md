## Why

当前营销方案预览（PlanPreview.tsx）使用 `dangerouslySetInnerHTML` 直接渲染 LLM 生成的 Markdown 内容，没有经过 Markdown→HTML 转换，导致：

- Markdown 语法符号（`##`、`**`、`-`、`###`）原样暴露在界面上
- 排版混乱，标题层级无样式区分，列表无缩进
- 影响用户体验和方案的专业传达

## What Changes

### 前端：安装 `marked` 库 + 添加 CSS 样式

- 安装 `marked`（轻量级 Markdown 解析库，~12KB）
- 在 `PlanPreview.tsx` 中使用 `marked.parse()` 将 `chapter.content`（Markdown）转为 HTML
- 在 `PlanPreview.tsx` 或全局样式文件中添加 `.chapter-content` 的 CSS 样式：
  - 标题层级（h1-h6）的字体大小、颜色、边距
  - 有序/无序列表的缩进与符号
  - 表格的边框与对齐
  - 引用块、代码块样式
  - **粗体** 和 *斜体* 样式

### 不修改

- 后端 LLM 继续输出 Markdown 格式，不改变数据格式
- PDF/Word 导出保持原有的 HTML 样式，不影响导出功能
- `PlanPage.tsx` 中的数据流不变

## Capabilities

### Modified Capabilities

- `document-export`（方案文档导出）：改进 Markdown 渲染质量，不影响导出功能本身

### Related Capabilities

- `plan-generation`（营销方案生成）：消费方，不修改

## Impact

- **安装依赖**：`marked` 加入 frontend/package.json
- **修改文件**：`frontend/src/pages/PlanPreview.tsx` — 增加 markdown 解析和 CSS 样式
- **变更量**：1 个依赖 + 1 个组件修改
