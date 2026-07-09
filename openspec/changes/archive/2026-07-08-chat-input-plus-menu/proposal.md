## Why

当前聊天输入框的附件功能通过独立的 📎 按钮触发，占用输入栏左侧空间。随着功能增多（贴图、做方案快捷入口、语音识别、制图、数据查询等），独立按钮的布局方式不可扩展。将功能入口收敛到单个"+"聚合菜单中，使界面更干净，也为后续功能扩展预留统一入口。

## What Changes

- 现有 📎 附件按钮改为 ➕ 聚合按钮
- 点击 ➕ 弹出浮层面板，展示 5 个功能入口：📎附件、🖼️制图、📋方案、💬语音、📈数据
- 📋方案：点击后预填品牌需求模板（`我是 [品牌名]，属于 [品类]，想在 [城市] 做活动，预算 [金额] 万，周期 [时长] 个月`）到输入框，自动聚焦，按 Enter 即发
- 💬语音：触发浏览器 SpeechRecognition API，识别结果填入输入框
- 🖼️制图和📈数据：点击提示"功能开发中"，不做具体路由
- 所有变化仅限于前端 `ChatInput.tsx`，无后端改动

## Capabilities

### New Capabilities

- `chat-input-plus-menu`: 聊天输入框"+"聚合菜单，收纳附件/做方案/语音识别/制图/数据入口

### Modified Capabilities

（无，均为新 UI 组件，无需修改现有 spec）

## Impact

- 仅修改 `frontend/src/components/ChatInput.tsx`，纯前端变更
- 依赖浏览器 `SpeechRecognition` API（`webkitSpeechRecognition`），需处理不兼容浏览器降级
- 不涉及 API 变更、后端修改、数据库变更
