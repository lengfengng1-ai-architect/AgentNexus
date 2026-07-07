## Tasks

1. [x] 在 `PlanPreview.tsx` 新增并 export `stripDuplicateTitleHeading` 纯函数
   - 实现 ATX 标题匹配（含 ATX 闭合 `#`、`\r\n`、行尾空行吸收）
   - 行内 markdown 标记清理（`*` `_` `` ` ``）
   - 重复判断：equals，或 startsWith + 分隔符（`：` `:` `—` `-` 空白）
   - 空 `title` guard
   - 验收：函数为纯函数，从 `PlanPreview.tsx` export 可用

2. [x] 接入两处渲染点
   - `PlanPreview.tsx`：`marked.parse(stripDuplicateTitleHeading(chapter.content, chapter.title))`
   - `PlanPage.tsx` `exportPdf()`：import helper，`marked.parse(stripDuplicateTitleHeading(ch.content, ch.title))`（保留既有 try-catch）
   - 验收：网页预览与 PDF 导出均不再重复章节标题

3. [x] 补充单测
   - `PlanPreview.test.tsx` 新增 `describe('stripDuplicateTitleHeading', ...)` 测试组
   - 覆盖应剥离 / 应保留场景（含分隔符判断、空 title、ATX 闭合、`\r\n`）
   - 验收：vitest 通过，`PlanPreview.test.tsx` 覆盖率 ≥80%

## 依赖关系

- Task 1 无前置依赖
- Task 2 依赖 Task 1（helper 已存在）
- Task 3 依赖 Task 1
