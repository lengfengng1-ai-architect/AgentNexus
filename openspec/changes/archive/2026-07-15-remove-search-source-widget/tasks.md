## 1. 删除搜索来源窗口

- [ ] 1.1 删除 `MarketResearchProgressCard.tsx` 第 51-74 行搜索来源窗口（🔍 搜索来源标题 + SourceCard 列表）
- [ ] 1.2 删除不再使用的 `SourceCard` import
- [ ] 1.3 删除 `sourcesEndRef` 引用

## 2. 验证

- [ ] 2.1 TypeScript 编译检查：`npx tsc --noEmit`
- [ ] 2.2 PC/移动端进度阶段：只有 ToolCallStatusBar（蓝色搜索条 + spinner）+ 进度日志窗口
