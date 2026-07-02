## 1. 类型定义

- [x] 1.1 创建 `src/types/marketAnalysis.ts`，定义全部 TypeScript 类型

## 2. API 层

- [x] 2.1 创建 `src/api/marketAnalysis.ts`：同步 + SSE 流式调用

## 3. Hooks

- [x] 3.1 创建 `src/hooks/useMarketAnalysis.ts`：状态管理、SSE 连接、fallback、防重复

## 4. 组件

- [x] 4.1 创建 `src/components/MarketAnalysisForm.tsx`：品牌名 + 品类输入 + 开始分析按钮
- [x] 4.2 创建 `src/components/AnalysisProgress.tsx`：5 段进度条
- [x] 4.3 创建 `src/components/IndustryTrendsCard.tsx`：行业趋势卡片
- [x] 4.4 创建 `src/components/TrendSignalsCard.tsx`：趋势信号卡片
- [x] 4.5 创建 `src/components/ConsumerInsightsCard.tsx`：消费者洞察卡片
- [x] 4.6 创建 `src/components/CompetitiveLandscapeCard.tsx`：竞争格局卡片
- [x] 4.7 创建 `src/components/FullReportAccordion.tsx`：可展开完整报告
- [x] 4.8 创建 `src/components/MarketAnalysisError.tsx`：错误状态
- [x] 4.9 创建 `src/components/NavigationTabs.tsx`：导航 Tab 栏

## 5. 页面

- [x] 5.1 创建 `src/pages/MarketAnalysisPage.tsx`：页面容器，编排 form → progress → report

## 6. 导航与入口

- [x] 6.1 修改 `src/App.tsx`：导航 Tab + 页面切换
- [x] 6.2 修改 `src/components/ChatContainer.tsx`：移除重复 header（由 NavigationTabs 统一管理）

## 7. 验证

- [x] 7.1 `cd frontend && npx tsc --noEmit` — 类型检查通过
- [x] 7.2 `cd frontend && npx vite build` — 构建成功
- [x] 7.3 浏览器验证：
  - Tab 导航切换 ✅
  - SSE 流式进度推进 ✅
  - 四维卡片展示 ✅
  - 完整报告可展开 ✅
  - 新分析按钮 ✅
  - 置信度标签 ✅
