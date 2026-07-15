## Context

移动端市场分析完成态当前渲染 MarketResearchResultCards，含 7 张卡片 + EvidenceCard + full_report。用户反馈字体混乱、URL 溢出、可视化差。

## Goals / Non-Goals

**Goals:**
- 移动端完成态只渲染 `full_report` markdown，统一字号
- 修复 URL 溢出
- 去掉 EvidenceCard 展示

**Non-Goals:**
- 不改动 MarketResearchResultCards（PC 端仍需使用）
- 不改动 MarketResearchProgressCard（进度阶段仍需使用）
- 不改动后端

## Decisions

**ChatBubble.tsx 渲染分支改动（第 78-80 行）：**

```
// Before:
isMarketResearch && message.marketResearchResult
  → <MarketResearchResultCards />  （所有端）

// After:
isMarketResearch && message.marketResearchResult
  → variant === 'mobile'
    ? 渲染 full_report（marked markdown + market-report-mobile CSS）
    : <MarketResearchResultCards />  （PC 端不变）
```

**CSS `market-report-mobile` 增强：**

```css
.market-report-mobile { font-size: 14px; line-height: 1.6; word-break: break-word; overflow-wrap: break-word; }
.market-report-mobile h1 { font-size: 17px; font-weight: 700; }
.market-report-mobile h2 { font-size: 15px; font-weight: 600; }
.market-report-mobile h3 { font-size: 14px; font-weight: 600; }
.market-report-mobile a { overflow-wrap: break-word; word-break: break-all; }
```

## Risks / Trade-offs

**风险**：低。仅影响 `variant === 'mobile'` 分支。`full_report` 为空时 fallback 到纯文本 `content` 渲染。
