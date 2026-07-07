## 概要

在 `exportPdf()` 函数中，对每章的 `ch.content` 先调用 `marked.parse()` 将其转换为 HTML，再将渲染后的 HTML 插入 PDF 文档。同时，将网页端已验证的 `.chapter-content` Markdown 样式同步复制到 PDF 的 CSS 中。

## 接口设计

本 change 不涉及 API 接口变更。对应的 OpenSpec YAML 文件为 `docs/api/paths/plan.yaml`（方案生成流水线），但无需修改。

## 数据流

```
ch.content (LLM 输出的原始 Markdown)
  │
  ▼
marked.parse()  ← 仅新增这一层，其余不变
  │
  ▼
HTML 字符串（包含 <h2>/<ul>/<table>/<blockquote> 等标签）
  │
  ▼
嵌入 PDF 内联 HTML → window.open() → 浏览器打印/保存为 PDF
```

## 技术方案

### 步骤 1：在 exportPdf() 中导入 marked 并渲染

文件：`frontend/src/pages/PlanPage.tsx`

在文件顶部添加：
```tsx
import { marked } from 'marked'
```

在 `exportPdf()` 函数中，修改章节内容的插入方式：

**修改前：**
```tsx
<div class="chapter-content">${ch.content}</div>
```

**修改后：**
```tsx
<div class="chapter-content">${marked.parse(ch.content)}</div>
```

### 步骤 2：同步 .chapter-content 样式

文件：`frontend/src/pages/PlanPage.tsx`，`exportPdf()` 函数内的 `<style>` 块

将 `PlanPreview.tsx` 中经过验证的 `.chapter-content` 样式完整复制到 PDF 内嵌样式表中。关键样式包括：

| 元素 | 关键样式 |
|------|---------|
| h2/h3/h4 | 字号、字重、间距 |
| p | 行高、下边距 |
| strong/em | 字重/斜体 |
| ul/ol | 缩进、间距 |
| table | 边框、单元格填充、表头背景 |
| blockquote | 左边框、背景色 |
| code/pre | 背景色、圆角、代码块暗色背景 |
| hr | 分隔线 |

### 步骤 3：更新测试

文件：`frontend/src/__tests__/PlanPreview.test.tsx`

补充 PDF 导出相关的基本渲染验证。由于 `exportPdf()` 是一个非导出函数（`PlanPage.tsx` 内的模块级函数），不直接测函数本身，而是：
- 验证当 chapters 包含 Markdown 内容时，PlanPreview 组件仍然正常渲染
- 验证 `marked` 在依赖中存在且可用

### 组件树

本 change 不涉及组件树变更。

### 错误处理

- `marked.parse()` 在极少数边界输入下可能抛出异常，添加 try-catch 兜底
- PDF 导出入口已有 `if (!chapters.length) return` 的健壮性检查

### 测试策略

- `exportPdf()` 为模块级非导出函数，当前不做单元测试（通过浏览器行为覆盖）
- `PlanPreview.test.tsx` 补充含 Markdown 内容的渲染测试
- `marked` 库本身已有完整测试，不重复测试

### 边界情况

- 章节内容为空字符串 → `marked.parse('')` 返回空字符串，正常
- 章节内容全为 Markdown 表格 → 样式表中已有 table CSS，正常渲染
- 章节内容包含代码块 → 样式表中已有 pre/code CSS，正常渲染
