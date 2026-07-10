## 1. 语音按钮从快捷行移入输入框行

- [x] 1.1 `ScreenChat.tsx` — 从 `.quick-btns` 删除"语音输入"按钮
- [x] 1.2 `ScreenChat.tsx` — 在 input 与 ↑ 之间新增圆形 mic 按钮（SVG 简笔线条图标）
- [x] 1.3 `mobile-workbench.css` — 新增 mic 按钮样式（圆形 38px、透明背景、hover 效果）

## 2. 填写简报预填逻辑

- [x] 2.1 `MobileWorkbenchPage.tsx` — onNavigate 签名扩展为 `(screen, inputText?)`，暂存 pendingBriefInput
- [x] 2.2 `ScreenChat.tsx` — "填写简报"按钮调用 `onNavigate('brief', inputValue)`
- [x] 2.3 `ScreenBrief.tsx` — 新增 `initialInput` prop，表单字段从 defaultValue 改为 state 管理
- [x] 2.4 `ScreenBrief.tsx` — 实现 `parseBriefInput()` 解析函数（正则提取品牌/品类/城市/预算/周期）
- [x] 2.5 `ScreenBrief.tsx` — 挂载时解析 initialInput 并预填表单字段

## 3. 测试验证

- [x] 3.1 运行现有测试，确认无回归
- [x] 3.2 手动验证：解析命中模板格式时正确预填
