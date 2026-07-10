## Why

用户点击「方案模版」按钮填入模板、填写完整后发送给 Agent，Agent 回复中带有「生成方案」按钮。点击该按钮虽然跳转到简报屏，但表单字段仍为默认 mock 数据（娃哈哈/魅力系列），未携带对话中已识别的品牌字段信息，导致用户需重新填写。

## What Changes

1. **ChatBubble** — `onGeneratePlan` 回调改为携带 `messageId` 参数
2. **ScreenChat** — `handleGeneratePlan` 根据 messageId 找到对应消息的 `brandInput` 和 `content`，传给 `onNavigate`
3. **MobileWorkbenchPage** — 从 ScreenChat 接收 inputText + brandInput，暂存并透传给 ScreenBrief
4. **ScreenBrief** — 接收可选的 `initialInput`（输入文本）和 `initialBrandData`（结构化品牌数据）props，挂载时按优先级合并后初始化表单字段

## Capabilities

### Modified Capabilities

- `mobile-chat-session`: ChatBubble 的 onGeneratePlan 回调签名变更，携带 messageId
- `mobile-workbench-preview`: ScreenBrief 支持从外部接收初始数据预填表单字段

## Impact

- `ChatBubble.tsx` — `onGeneratePlan` 签名从 `() => void` 改为 `(messageId: string) => void`
- `ScreenChat.tsx` — `handleGeneratePlan` 提取消息数据传给 `onNavigate`
- `MobileWorkbenchPage.tsx` — 新增 pendingChatData state，中转数据到 ScreenBrief
- `ScreenBrief.tsx` — 新增 `initialInput` / `initialBrandData` props + merge 初始化逻辑
