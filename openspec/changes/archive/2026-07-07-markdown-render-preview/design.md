## Design

### 概述

在 `PlanPreview.tsx` 中引入 `marked` 库，将 LLM 输出的 Markdown 内容渲染为格式完整的 HTML，并补充 CSS 样式覆盖所有常用 Markdown 元素。

### 数据流

```
LLM → Markdown 字符串 → chapter.content (PlanChapter)
  → PlanPreview.tsx 内 marked.parse(content) → HTML
  → dangerouslySetInnerHTML 渲染，配合 CSS 样式
```

后端不感知此改动，数据格式不变。

### 实现细节

#### 1. 安装依赖

```bash
npm install marked
```

`marked` 是成熟稳定的 Markdown 解析器，零外部依赖，类型声明内建，无需额外 `@types/marked`。

#### 2. PlanPreview.tsx 修改

在组件函数内引入：

```typescript
import { marked } from 'marked'
```

在渲染章节展开内容的 `dangerouslySetInnerHTML` 处，对 `chapter.content` 做转换：

```typescript
// 当前:
dangerouslySetInnerHTML={{ __html: chapter.content }}

// 改为:
dangerouslySetInnerHTML={{ __html: marked.parse(chapter.content) }}
```

#### 3. CSS 样式设计

在 `PlanPreview.tsx` 内添加 `.chapter-content` 的样式（使用内联 `<style>` 标签或组件级 CSS）。需要覆盖的 Markdown 元素：

**标题层级（h1-h6）：**
- h1: 大标题，营销方案中极少出现。如出现则视为章节主标题
- h2: 章节二级标题（`## 市场概况与趋势`）— font-size: 1.25rem, font-weight: 700, color: #0f172a, mt: 1.5em, mb: 0.75em
- h3: 三级标题（`### 一、市场概况与趋势`）— font-size: 1.1rem, font-weight: 600, color: #1e293b, mt: 1.25em, mb: 0.5em
- h4: 四级标题（`#### 当前市场呈现四大趋势`）— font-size: 1rem, font-weight: 600, color: #334155, mt: 1em, mb: 0.5em

**段落与内联元素：**
- p: margin-bottom: 0.75em, line-height: 1.8
- strong/b: font-weight: 600
- em: font-style: italic

**列表：**
- ul/ol: margin: 0.5em 0, padding-left: 1.5em
- li: margin-bottom: 0.3em, line-height: 1.7

**表格：**
- table: width: 100%, border-collapse: collapse, margin: 1em 0
- th/td: border: 1px solid #e2e8f0, padding: 8px 12px, text-align: left
- th: background: #f8fafc, font-weight: 600

**引用：**
- blockquote: border-left: 3px solid #3b82f6, padding: 8px 16px, margin: 1em 0, background: #f8fafc, color: #475569

**代码：**
- code（内联）: background: #f1f5f9, padding: 2px 6px, border-radius: 4px, font-size: 0.875em
- pre（代码块）: background: #1e293b, color: #e2e8f0, padding: 16px, border-radius: 8px, overflow-x: auto, margin: 1em 0
- pre code: background: transparent, padding: 0, color: inherit

**分割线：**
- hr: margin: 1.5em 0, border: none, border-top: 1px solid #e2e8f0

#### 4. 样式注入方式

在 `PlanPreview.tsx` 文件尾部使用 inline `<style>` 标签注入样式，与现有组件的 Tailwind 样式叠加。这样做：

- 样式与组件同文件，便于维护
- 不影响其他页面的样式
- 优先级比 Tailwind 的预置 CSS 高（全局样式 vs. 组件级类名）

#### 5. 预览格式保留

- 现有展开/折叠、数字编号、标题/副标题布局保持不变
- 仅章节内容的渲染方式从「纯文本→HTML」变为「Markdown→HTML」
- 空章节、loading 状态等的处理不变

### 接口设计

无新增 API 端点。前端内部改动。

### 对应 OpenSpec

- `openspec/specs/plan-generation-workbench/spec.md` — 预览组件在前端工作台

### 测试

- `PlanPreview` 组件现有测试已覆盖空章节、展开/折叠等状态
- 本次改动后补充测试：验证 `marked.parse` 正确渲染 Markdown 语法（标题、列表、粗体）
