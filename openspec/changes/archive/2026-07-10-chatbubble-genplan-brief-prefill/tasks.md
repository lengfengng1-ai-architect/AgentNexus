## 1. ChatBubble — onGeneratePlan 签名变更

- [ ] 1.1 `ChatBubble.tsx` — `onGeneratePlan` 签名从 `() => void` 改为 `(messageId: string) => void`，按钮点击时调用 `onGeneratePlan(message.id)`

## 2. ScreenChat — 根据 messageId 提取数据并传递

- [ ] 2.1 `ScreenChat.tsx` — `handleGeneratePlan` 根据 messageId 在 `messages` 中查找对应消息，提取 `brandInput` 和 `content`
- [ ] 2.2 `ScreenChat.tsx` — 将 `content` 和 `brandInput` 通过 `onNavigate('brief', content, brandInput)` 传递

## 3. MobileWorkbenchPage — 中转数据到 ScreenBrief

- [ ] 3.1 `MobileWorkbenchPage.tsx` — `onNavigate` 签名从 `(s: MobileScreen)` 改为 `(s: MobileScreen, inputText?: string, brandInput?: BrandInput)`
- [ ] 3.2 `MobileWorkbenchPage.tsx` — 新增 `pendingChatData` state 暂存，传递给 `<ScreenBrief>`

## 4. ScreenBrief — initialInput / initialBrandData 预填

- [x] 4.1 `ScreenBrief.tsx` — 新增 `initialInput` 和 `initialBrandData` props
- [x] 4.2 `ScreenBrief.tsx` — 挂载时 merge 初始化：BrandInput > parseBriefInput > mock default

## 5. 测试验证

- [x] 5.1 运行现有测试，确认无回归
