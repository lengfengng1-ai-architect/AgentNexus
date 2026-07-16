## 1. 渲染分支统一

- [x] 1.1 删除 `ChatBubble.tsx` 第 80 行 `variant === 'mobile' ?` 条件，PC/移动端统一渲染 `full_report` marked markdown

## 2. 验证

- [x] 2.1 TypeScript 编译检查：`npx tsc --noEmit`
- [ ] 2.2 PC 端市场分析完成态：展示统一 markdown 报告，无结构化卡片
