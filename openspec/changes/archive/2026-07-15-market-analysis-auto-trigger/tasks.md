## 1. 移除按钮及相关 prop

- [x] 1.1 ChatBubble 移除 `canStartMarketResearch && onStartMarketResearch` 按钮 JSX 及其相关 prop
- [x] 1.2 ScreenChat 移除 `onStartMarketResearch` prop 传递
- [x] 1.3 ChatContainer 移除 `onStartMarketResearch` prop 传递

## 2. 自动触发

- [x] 2.1 ScreenChat 加 `useEffect` 监听 messages，`canStartMarketResearch` 且未被触发时自动调用 `handleStartMarketResearch`
- [x] 2.2 ChatContainer 加 `useEffect` 监听 messages，`canStartMarketResearch` 且未被触发时自动调用 `handleStartMarketResearch`

## 3. 验证

- [x] 3.1 类型检查通过（tsc --noEmit 零错误）
- [x] 3.2 测试通过（30/30 通过）
