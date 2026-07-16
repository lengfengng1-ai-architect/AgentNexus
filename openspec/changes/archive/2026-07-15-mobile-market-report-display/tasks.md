## 1. ChatBubble 渲染分支改动

- [x] 1.1 在 `ChatBubble.tsx` 第 78-80 行增加 `variant === 'mobile'` 判断：有 `marketResearchResult` 且为移动端时，直接渲染 `full_report` markdown
- [x] 1.2 `full_report` 为空时 fallback 到纯文本 `content` 渲染

## 2. CSS 增强

- [x] 2.1 在 `ChatBubble.tsx` `<style>` 块中增强 `market-report-mobile` class：统一字号（正文 14px/h1 17px/h2 15px/h3 14px）+ overflow-wrap + break-all

## 3. 验证

- [x] 3.1 TypeScript 编译检查：`npx tsc --noEmit`
- [ ] 3.2 移动端浏览器实测：完成态只显示 `full_report`，无结构化卡片，URL 不溢出
- [ ] 3.3 PC 端回归：MarketResearchResultCards 正常渲染
