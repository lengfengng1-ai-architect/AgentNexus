## 概要

在 `marked.parse` 之前，对 `chapter.content` 调用纯函数 `stripDuplicateTitleHeading(content, title)`，
剥离开头与章节 `title` 重复的 Markdown ATX 标题。两处渲染点（`PlanPreview`、`exportPdf`）共用同一 helper。

## 接口设计

本 change 不涉及 API 接口变更。对应 OpenSpec YAML 为 `docs/api/paths/plan.yaml`，无需修改。

## 数据流

```
ch.content（LLM Markdown）
  → stripDuplicateTitleHeading(content, title)   ← 新增
  → marked.parse(...)
  → 渲染（网页预览 / PDF）
```

## helper 设计

`stripDuplicateTitleHeading(content: string, title: string): string`（在 `PlanPreview.tsx` 中 export）

匹配规则：
1. 空 `title` → 直接返回 content（guard，避免「以空串开头」恒真）
2. 匹配开头 ATX 标题：`/^#{1,6}\s+(.+?)[ \t#]*(?:\r?\n)+/`
   - `(.+?)` 捕获标题文本
   - `[ \t#]*` 吸收行尾空白与 ATX 闭合 `#`
   - `(?:\r?\n)+` 兼容 `\r\n` 并吃掉标题后空行
3. 标题文本去掉行内 markdown 标记（`*` `_` `` ` ``）并 `trim()`
4. 判断是否为重复标题：
   - `headingText === title`，或
   - `headingText` 以 `title` 开头，且紧随其后是分隔符 `[：:—\-\s]`（覆盖 `title：subtitle` / `title - desc` 等）
   - 「以 title 开头但无分隔符」（如 `title深度报告`）视为合法标题，**保留**
5. 判定为重复 → 返回 `content.slice(m[0].length)`；否则原样返回

## 边界处理

- ATX 闭合 `#`（`# title #`）
- 行尾无换行 / `\r\n` 行尾
- 标题含 `**粗体**` 等行内标记
- 空 `title` guard
- 已知不支持：Setext 标题（`title\n===`）

## 测试策略

`PlanPreview.test.tsx` 新增 `describe('stripDuplicateTitleHeading', ...)`：

应剥离：
- `# 市场洞察` + title=`市场洞察`
- `## 市场洞察：运动消费持续增长` + title=`市场洞察`
- `# **市场洞察**`（粗体标题）
- `# 市场洞察 #`（ATX 闭合）
- `\r\n` 行尾

应保留：
- `## 标题B` + title=`市场洞察`（无关标题）
- 空 `title`
- 无标题行（纯正文）
- `## 市场洞察深度报告` + title=`市场洞察`（无分隔符的合法标题）

验收：vitest 通过，覆盖率 ≥80%。

## 边界情况

- content 仅一行标题无正文：剥离后返回空字符串，渲染为空，可接受。
- chapter `title` 为高辨识度中文短语，分隔符判断把误剥风险降到很低。
