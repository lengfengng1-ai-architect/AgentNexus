## Why

移动端（ScreenChat）市场分析完成后使用 MarketResearchResultCards 组件展示结果，包含 7 张结构化卡片 + EvidenceCard + full_report，用户反馈三个问题：

1. **字体大小不一**：各子卡片各自定义字号，整体混乱
2. **网页来源超出气泡框**：SourceCard 中 URL 在移动端窄屏溢出
3. **最终报告可视化差**：结构化卡片拆解与完整报告内容重复

## What Changes

仅改动 `frontend/src/components/ChatBubble.tsx`：

- ChatBubble 渲染分支：移动端（`variant === 'mobile'`）有 `marketResearchResult` 时，只渲染 `full_report` 的 marked markdown，跳过 MarketResearchResultCards
- 增强 `market-report-mobile` CSS class：统一字号（正文 14px，h1 17px，h2 15px）+ 溢出控制

## Capabilities

### Modified Capabilities

- `market-analysis`: 移动端市场分析完成态从结构化卡片改为完整 markdown 报告

## Impact

| 文件 | 说明 |
|------|------|
| `frontend/src/components/ChatBubble.tsx` | 渲染分支加 `variant === 'mobile'` 判断；CSS 增强 |

PC 端行为完全不受影响。进度阶段 MarketResearchProgressCard 保持不变。
