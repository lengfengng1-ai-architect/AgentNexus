## 1. ScreenChat 状态替换 — useChat 引入

- [x] 1.1 删除 `Msg[]` 本地类型定义、`INITIAL` 数组、`AGENT_REPLY` 常量、`seq`/`nextId()`
- [x] 1.2 在 ScreenChat 中调用 `useChat()` 获取 `messages`/`inputValue`/`setInputValue`/`sendMessage`/`isLoading`/`error`
- [x] 1.3 将消息列表渲染从 `messages.map(m => <div className="bubble">)` 改为 `<ChatBubble message={m} />`
- [x] 1.4 输入框 `value`/`onChange`/`onKeyDown`/发送按钮的 `onClick` 改用 `useChat` 的 `inputValue`/`setInputValue`/`sendMessage`
- [x] 1.5 输入框发送时调用 `sendMessage(inputValue.trim())` 替代原来的 `setInput → setTimeout` 逻辑

## 2. ChatBubble 复用与样式适配

- [x] 2.1 在 `.mw` 作用域下覆盖 ChatBubble 生成的 DOM 元素样式（移动端灰底/蓝底气泡、14px 圆角），不改 ChatBubble 源码
- [x] 2.2 移除 `WelcomeCard` 依赖（已有 INITIAL 模拟欢迎语改为后端 greet，不再需要前端欢迎卡片）

## 3. canGeneratePlan 导航到②简报屏

- [x] 3.1 在 MobileWorkbenchPage 层为 ScreenChat 的 `canGeneratePlan` 事件添加回调，触发 `setScreen('brief')`
- [x] 3.2 保留快捷按钮「填写简报」的 `onNavigate('brief')` 快速导航

## 4. 文件附件上传

- [x] 4.1 ScreenChat 附件按钮 `onChange` 中实现文件上传：构建 `FormData` → `fetch POST /api/v1/upload` → 拿 URL
- [x] 4.2 上传成功后调用 `sendMessage(inputValue.trim(), imageUrls=uploadedUrls)`
- [x] 4.3 上传失败时显示 Toast 或 ErrorBar 提示

## 5. 错误处理

- [x] 5.1 在 ScreenChat 顶部添加 ErrorBar（从 `useChat.error` 驱动），点击关闭清空 error
- [x] 5.2 消息气泡的 retry 按钮通过 `ChatBubble` 的 `onRetry` prop 传入 `retryMessage`

## 6. 清理与验证

- [x] 6.1 删除 ScreenChat 中不再使用的 import（`useEffect`/`useRef` 保留语音和滚动；`INITIAL`/`AGENT_REPLY` 相关 import 全删）
- [x] 6.2 验证全流程：TS 编译 ✓、90/90 测试通过 ✓、TypeScript 零错误 ✓
