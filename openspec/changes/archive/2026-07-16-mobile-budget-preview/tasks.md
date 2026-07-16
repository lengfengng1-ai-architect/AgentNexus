# 任务 | mobile-budget-preview

## 1. 创建 ScreenBudgetPreview 组件 ✅

- [x] 交互式饼图（SVG + 鼠标/触摸拖拽）
- [x] 饼图图例（名称 + 占比% + 金额）
- [x] 核心 KPI 指标（2×2 网格，联动更新）
- [x] 关键里程碑卡片（时间 + 预算 + 内容描述）
- [x] 底部备注输入框 + 发送按钮
- [x] 顶部返回栏
- [x] 拖拽 tooltip 跟随鼠标
- [x] KPI 联动公式
- [x] 里程碑预算分配公式

## 2. 简化 ScreenGenerate 弹窗 ✅

- [x] 删除预算分配区块
- [x] 删除 KPI 指标区块
- [x] 删除里程碑区块
- [x] 保留标题、总预算/周期、两个按钮
- [x] 新增"预览预算"按钮，导航到全屏页
- [x] 集成 onOpenBudgetPreview 回调
- [x] 保留驳回重跑功能（含驳回输入框）

## 3. MobileWorkbenchPage 路由集成 ✅

- [x] 添加 budget-preview 到 MobileScreen
- [x] Tab 栏在预算预览页隐藏
- [x] PhoneFrame 顶栏在预算预览页隐藏
- [x] 预算预览全屏覆盖渲染（position:fixed）
- [x] 返回时回调 handleBudgetPreviewBack

## 4. Hook 扩展 ✅

- [x] approve() 支持可选 budgetAllocations 参数
- [x] 新增 approveWithBudget() 方法
- [x] 导出 BudgetAllocation 类型

## 5. OpenSpec 文档 ✅

- [x] proposal.md
- [x] design.md
- [x] spec.md
- [x] tasks.md
