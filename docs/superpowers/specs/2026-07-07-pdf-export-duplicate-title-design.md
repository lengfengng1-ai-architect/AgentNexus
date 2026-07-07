# 营销方案 标题重复修复 — 设计草稿

日期：2026-07-07
状态：设计已确认，作为 `/opsx:propose` 输入
关联 capability：`document-export` / `plan-generation-workbench`

## 背景

营销方案章节的 `title` / `subtitle` 由后端 `PLAN_CHAPTER_SPEC` 硬编码，LLM 只负责生成 `content`。
但 LLM 生成的 `content` 开头经常重复一遍标题信息，典型两种表现：

1. **简单重复**：content 以 `# 市场洞察` 开头，而 UI 已渲染 `1. 市场洞察` 作为章节标题。
2. **标题+副标题**：content 以 `# 市场洞察：运动消费持续增长` 开头（title：subtitle 形式）。

渲染层（`PlanPreview` 网页预览 + `exportPdf` PDF 导出）都是「先显示 title/subtitle，再显示 content」，
导致 content 里重复的标题被多渲染一次。该问题在**预览和 PDF 中都存在**，不止 PDF。

> 注：LLM 偶尔会把整段「目录」（多行 `1. xxx；2. yyy`）当 content，属内容质量问题，
> 渲染层无法可靠识别，留给未来 prompt 端根治，不在本 change 范围。

## 方案（用户已确认：只改渲染层）

新增纯函数 `stripDuplicateTitleHeading(content, title)`，在 `marked.parse` 之前剥离与章节标题重复的开头 ATX 标题。
两处渲染点（`PlanPreview`、`exportPdf`）共用同一 helper。

### 匹配规则

1. 匹配 content 开头的 ATX 标题：`^#{1,6}\s+(文本)[ \t#]*(?:\r?\n)+`
   - `[ \t#]*` 吸收行尾空白与 ATX 闭合 `#`（如 `# title #`）
   - `(?:\r?\n)+` 兼容 `\r\n` 并吃掉标题后空行
2. 将标题文本去掉行内 markdown 标记（`*` `_` `` ` ``）并 `trim()`
3. **判断是否重复**（关键：避免误剥合法标题）：
   - `headingText === title`，或
   - `headingText` 以 `title` 开头**且**紧随其后是分隔符（`：` `:` `—` `-` 空白），例如 `市场洞察：运动消费持续增长`
   - 这样 `市场洞察深度报告`（无分隔符）不会被误剥
4. guard：`title` 为空直接返回 content（避免「以空串开头」恒真）

### 接入点

- `PlanPreview.tsx`：`marked.parse(stripDuplicateTitleHeading(chapter.content, chapter.title))`
- `PlanPage.tsx` 的 `exportPdf()`：`marked.parse(stripDuplicateTitleHeading(ch.content, ch.title))`（保留既有 try-catch 兜底）

helper 放在 `PlanPreview.tsx` 并 `export`（`PlanPage` 已从该文件 import `PlanPreview`，复用即可，不新建目录）。

## 边界情况

- 空 title → 直接返回（guard）
- ATX 闭合 `#`（`# title #`）→ 识别为 title
- 无尾换行 / `\r\n` → 正则兼容
- 标题含 `**粗体**` 等行内标记 → 清理后比对
- Setext 标题（`title\n===`）→ 不支持（LLM 输出罕见）

## 已知限制

- 只剥开头**单行 ATX 标题**；多行「目录块」不处理（内容质量问题）。
- 不支持 Setext 标题。

## 测试

`PlanPreview.test.tsx` 新增 `stripDuplicateTitleHeading` 测试组，覆盖：
- 应剥离：`# title`、`## title：subtitle`、含 `**粗体**` 标题、ATX 闭合 `#`、`\r\n`
- 应保留：无关标题、空 title、无标题行、`title深度报告`（无分隔符的合法标题）
