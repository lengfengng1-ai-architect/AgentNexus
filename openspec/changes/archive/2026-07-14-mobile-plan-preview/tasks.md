## 1. 类型扩展

- [x] 1.1 ScreenChat.tsx 中 MobileScreen 增加 `'preview'` 类型

## 2. MobileWorkbenchPage 路由

- [x] 2.1 新增 preview screen（display 控制、topbar 配置、handleBack 路由）
- [x] 2.2 将 planRun.chapters 传给 ScreenPreview
- [x] 2.3 preview 屏的 isExportReady 设为 true

## 3. ScreenPreview 组件

- [x] 3.1 新建 ScreenPreview.tsx，接收 chapters props，渲染折叠式章节列表（与工作台 PlanPreview 一致）
- [x] 3.2 支持默认展开前 3 章 + 展开全部/折叠全部

## 4. ScreenGenerate 按钮

- [x] 4.1 "生成结果"标题右侧添加"查看完整方案"按钮，点击调用 onNavigate('preview')
