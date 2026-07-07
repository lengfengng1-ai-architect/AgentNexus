## Why

营销方案章节的 `title` / `subtitle` 由后端 `PLAN_CHAPTER_SPEC` 硬编码，LLM 仅生成 `content`。
但 LLM 生成的 `content` 开头经常重复标题信息（如 `# 市场洞察`，或 `# 市场洞察：运动消费持续增长`），
而渲染层（网页预览 `PlanPreview` 与 PDF 导出 `exportPdf`）已单独渲染了 `title` / `subtitle`，
导致标题在**预览和 PDF 中都重复显示**。这是上一个 change（`pdf-export-markdown-render`）解决 PDF Markdown 渲染后暴露的下一个问题。

## What Changes

- 新增纯函数 `stripDuplicateTitleHeading(content, title)`：在 `marked.parse` 之前，剥离开头与章节 `title` 重复的 Markdown ATX 标题。
- 匹配含分隔符判断（`title` 后紧跟 `：` `:` `—` `-` 空白），避免误剥「以 title 开头的合法标题」。
- 在 `PlanPreview.tsx`（网页预览）与 `PlanPage.tsx` 的 `exportPdf()`（PDF 导出）两处接入。
- 补充单测覆盖剥离与保留场景。

## Capabilities

### Modified Capabilities

- `document-export`（方案文档导出）：PDF 导出不再重复渲染章节标题。
- `plan-generation-workbench`（方案生成工作台）：网页预览不再重复渲染章节标题。

## Impact

- 前端：
  - `frontend/src/pages/PlanPreview.tsx`（新增并 `export` helper、接入渲染）
  - `frontend/src/pages/PlanPage.tsx`（import helper、接入 `exportPdf`）
  - `frontend/src/__tests__/PlanPreview.test.tsx`（新增 `stripDuplicateTitleHeading` 测试组）
- 依赖：无新增。
- 后端：无改动（本 change 不修改 `plan_generator_chapter.md.j2` prompt）。

## Non-goals

- 不修改后端 prompt 模板（`plan_generator_chapter.md.j2`）—— 留作未来根治，从源头让 LLM 不重复标题。
- 不剥离多行「目录块」内容（`1. xxx；2. yyy`）—— 属内容质量问题，渲染层无法可靠识别。
- 不支持 Setext 标题（`title\n===`）—— LLM 输出罕见。
