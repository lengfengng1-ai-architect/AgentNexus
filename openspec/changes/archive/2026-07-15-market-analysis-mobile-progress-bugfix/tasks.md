## 1. 修复 data 事件滥设 result

- [x] 1.1 ScreenChat `data` 事件处理中移除 `setMarketResearchResult` 调用
- [x] 1.2 ChatContainer `data` 事件处理中移除 `setMarketResearchResult` 调用

## 2. 移动端结果展示改进

- [x] 2.1 CompetitiveLandscapeCard 加 `variant` prop；MarketResearchResultCards 中传 `variant={isMobile ? 'mobile' : undefined}`
- [x] 2.2 完整报告容器在移动端加 `break-all` 防止溢出

## 3. 验证

- [x] 3.1 类型检查通过
- [x] 3.2 现有测试全部通过
