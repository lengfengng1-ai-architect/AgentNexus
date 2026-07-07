## Tasks

1. [x] **在 exportPdf() 中导入 marked 并转换 Markdown 为 HTML**
   - 在 `frontend/src/pages/PlanPage.tsx` 顶部添加 `import { marked } from 'marked'`
   - 将 `exportPdf()` 中的 `${ch.content}` 改为 `${marked.parse(ch.content)}`
   - 添加 try-catch 兜底处理 `marked.parse()` 可能的异常，异常时 fallback 到原始文本
   - 验收条件：PDF 导出文档中 Markdown 内容被渲染为 HTML

2. [x] **同步 PDF 内嵌 CSS 样式，与网页版一致**
   - 将 `PlanPreview.tsx` 中 `_previewStyle` 的 `.chapter-content` 样式（h2/h3/h4/p/strong/em/ul/ol/table/blockquote/code/pre/hr）完整复制到 `exportPdf()` 的 `<style>` 块中
   - 验收条件：PDF 中标题、列表、表格、引用、代码块的渲染风格与网页预览一致

3. [x] **更新测试覆盖 PDF 导出相关的渲染场景**
   - 在 `frontend/src/__tests__/PlanPreview.test.tsx` 中补充含 Markdown 内容的 PlanPreview 渲染测试
   - 验证 PlanPreview 在 chapters 含 Markdown 标记时的渲染结果
   - 验收条件：测试通过，覆盖率 ≥80%

## 依赖关系

- Task 1 无前置依赖
- Task 2 无前置依赖
- Task 3 无前置依赖（可并行执行）
