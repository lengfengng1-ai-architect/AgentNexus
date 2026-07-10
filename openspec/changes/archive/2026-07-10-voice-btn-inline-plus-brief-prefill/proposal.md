## Why

移动端①对话入口屏的语音输入按钮当前以文字按钮形式放在快捷按钮行（`.quick-btns`）中，视觉上不够紧凑。同时"填写简报"按钮点击后跳转到②简报屏，但简报表单内容固定为硬编码 mock 数据，无法利用用户在对话框中已输入的信息进行预填，需要用户重复输入，体验割裂。

## What Changes

- `ScreenChat.tsx` — `.quick-btns` 中删除"语音输入"按钮；`.inputbar-row` 中 input 与 ↑ 发送按钮之间新增圆形 mic 小按钮（纯 SVG 简笔线条图标）；"填写简报"按钮点击时携带当前输入文本
- `MobileWorkbenchPage.tsx` — 接收来自 ScreenChat 的输入文本，暂存并传给 ScreenBrief
- `ScreenBrief.tsx` — 新增 `initialInput` prop，挂载时解析预填表单字段

## Capabilities

### New Capabilities

- `mobile-brief-prefill`: 从用户输入文本中提取品牌、品类、城市等信息，预填简报表单字段

### Modified Capabilities

- `mobile-chat-session`: ScreenChat 输入条布局调整（语音按钮从快捷行移入输入框行）& "填写简报"携带聊天输入文本
- `mobile-workbench-preview`: ScreenBrief 接收 inputText 并解析预填

## Impact

- `frontend/src/pages/mobile-workbench/ScreenChat.tsx` — 修改 onNavigate 调用、删除语音按钮、新增 mic 按钮
- `frontend/src/pages/mobile-workbench/MobileWorkbenchPage.tsx` — 新增输入文本暂存与传递
- `frontend/src/pages/mobile-workbench/ScreenBrief.tsx` — 新增 initialInput prop + 解析预填逻辑
- `frontend/src/__tests__/MobileWorkbenchPage.test.tsx` — 适配 onNavigate 签名变更
- 不修改后端，不新增 npm 依赖
