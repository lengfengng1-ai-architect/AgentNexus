## 1. 提升 useMobilePlanRun 到 MobileWorkbenchPage

- [x] 1.1 在 MobileWorkbenchPage 中调用 useMobilePlanRun()
- [x] 1.2 将 planRun（完整返回对象）传给 ScreenGenerate
- [x] 1.3 将 outputs 和 chapters 传给 ScreenActions

## 2. 修改 ScreenGenerate 使用 prop

- [x] 2.1 移除 ScreenGenerate 内的 useMobilePlanRun() 调用
- [x] 2.2 接收 planRun prop 替代
- [x] 2.3 解构 planRun 获取 start / approve 等方法

## 3. 导出 MobilePlanRunAPI 类型

- [x] 3.1 在 useMobilePlanRun.ts 中定义 MobilePlanRunAPI interface
- [x] 3.2 导出 MobilePlanRunAPI 类型

## 4. 重写 ScreenActions 数据对接

- [x] 4.1 接收 outputs 和 chapterCount props
- [x] 4.2 实现 buildCards() 函数，从 outputs 提取 6 个平台卡片 + 2 个外部推广卡片
- [x] 4.3 替换假数据渲染为动态卡片渲染
- [x] 4.4 无数据时展示空态提示
- [x] 4.5 删除旧的假数据 CARDS 数组和 FILTERS 硬编码

## 5. 验证

- [ ] 5.1 启动前端，确认 TypeScript 编译无错
- [ ] 5.2 确认空态提示在无数据时正常显示
- [ ] 5.3 确认方案生成完成后跳转到行动建议屏展示真实数据
