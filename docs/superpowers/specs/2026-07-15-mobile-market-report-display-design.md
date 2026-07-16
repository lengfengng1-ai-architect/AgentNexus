# 移动端市场分析报告展示优化 · 设计文档

- **日期**: 2026-07-15
- **状态**: 设计确认
- **对应能力**: market-analysis

## 背景

移动端（ScreenChat）市场的分析完成态使用 MarketResearchResultCards 组件展示结果，包含 7 张结构化卡片 + EvidenceCard + full_report。用户反馈三个问题：

1. **字体大小不一**：各子卡片组件各自定义字号，整体混乱
2. **网页来源超出气泡框**：SourceCard 中的 URL 在移动端窄屏溢出
3. **最终报告可视化差**：结构化卡片拆解与完整报告重复，不如统一成一份流畅的 markdown 文档

## 目标

移动端市场分析完成后，只渲染 `full_report`（marked markdown）作为整体结果展示，不做结构化卡片拆解。

PC 端保持 `MarketResearchResultCards` 不变。

## 方案

### 渲染逻辑变更

文件：`frontend/src/components/ChatBubble.tsx`，第 78-80 行三叉分支。

**改动前：**
```
有 marketResearchResult → 渲染 MarketResearchResultCards（所有端）
```

**改动后：**
```
有 marketResearchResult:
  if variant === 'mobile':
    渲染 full_report（marked markdown + market-report-mobile CSS）
  else:
    渲染 MarketResearchResultCards（PC 端不变）
```

### CSS 增强

在 `ChatBubble.tsx` 现有 `<style>` 块中增强 `market-report-mobile` class：

```css
.market-report-mobile {
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  overflow-wrap: break-word;
  color: #1e293b;
}
.market-report-mobile h1 { font-size: 17px; font-weight: 700; margin: 1em 0 0.5em; }
.market-report-mobile h2 { font-size: 15px; font-weight: 600; margin: 1em 0 0.5em; }
.market-report-mobile h3 { font-size: 14px; font-weight: 600; margin: 0.75em 0 0.4em; }
.market-report-mobile p { margin-bottom: 0.6em; line-height: 1.6; }
.market-report-mobile a { color: #1677ff; overflow-wrap: break-word; word-break: break-all; }
.market-report-mobile table { font-size: 13px; }
.market-report-mobile code { font-size: 13px; }
.market-report-mobile blockquote { font-size: 13px; }
```

### 进度阶段不变

移动端在分析进行中（有 sources/logs 但无 result）仍展示 `MarketResearchProgressCard`（搜索来源 + 进度日志）。仅分析**完成后**切换为纯 `full_report` 渲染。

## 文件变更清单

| 文件 | 说明 |
|------|------|
| `frontend/src/components/ChatBubble.tsx` | 渲染分支增加 `variant === 'mobile'` 判断（~5 行） + CSS 增强（~15 行） |

## 边界情况

| 情况 | 处理 |
|------|------|
| `full_report` 为空 | fallback 到纯文本 `content` 渲染 |
| 分析进行中 | 保持 MarketResearchProgressCard 不变 |
| PC 端 | 完全不受影响 |
| 报告中含表格/代码 | `marked.parse()` 正常渲染，移动端字号统一缩小 |
