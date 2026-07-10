## 1. 快捷工具栏按钮排序 + 文案 + 行为

- [x] 1.1 `ScreenChat.tsx` — 按钮排序改为「附件上传 方案模版 方案生成 产品海报 产品视频」
- [x] 1.2 `ScreenChat.tsx` — 方案生成按钮调用 `onNavigate('brief')` 纯跳转
- [x] 1.3 `ScreenChat.tsx` — 新增 handlePosterTemplate 填入海报 prompt 模板
- [x] 1.4 `ScreenChat.tsx` — 新增 handleVideoTemplate 填入视频 prompt 模板

## 2. ChatBubble 移动端全宽蓝色胶囊

- [x] 2.1 `ChatBubble.tsx` — `variant === 'mobile'` 时"生成方案"按钮改为全宽 `#1677ff` 蓝色胶囊样式

## 3. 测试验证

- [x] 3.1 运行现有测试，确认无回归
