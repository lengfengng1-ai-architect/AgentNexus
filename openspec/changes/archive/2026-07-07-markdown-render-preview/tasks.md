## 1. 安装依赖

- [x] 1.1 在 frontend/ 目录下执行 `npm install marked`，确保 package.json 和 lock 文件更新
- [x] 1.2 验证 `marked` 类型声明可被 TypeScript 识别（无需额外 @types/marked）

## 2. PlanPreview.tsx — Markdown 渲染改造

- [x] 2.1 在文件头引入 `import { marked } from 'marked'`
- [x] 2.2 将 `dangerouslySetInnerHTML` 处的 `chapter.content` 改为 `marked.parse(chapter.content)`
- [x] 2.3 组件内添加 `.chapter-content` 的 CSS 样式（标题层级 h2-h4、段落、列表、表格、引用、代码块）
- [x] 2.4 样式中使用组件级 `<style>` 标签注入，不污染全局

## 3. 测试

- [x] 3.1 修改 `frontend/src/__tests__/PlanPreview.test.tsx`：验证 Markdown 标题（`## 标题`）被渲染为 `<h2>`，列表被渲染为 `<ul>/<li>`
- [x] 3.2 运行 `npm test` 确认所有测试通过（8 passed ✓）
- [x] 3.3 手动验证：生成营销方案后预览各章节，Markdown 语法不再暴露

## 4. 验证

- [x] 4.1 启动 dev server，输入品牌信息生成方案
- [x] 4.2 确认每个章节展开后内容排版整洁、标题层级正确、列表/表格样式正常
- [x] 4.3 确认 PDF/Word 导出功能不受影响
