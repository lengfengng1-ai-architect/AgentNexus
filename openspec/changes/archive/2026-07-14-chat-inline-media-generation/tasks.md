## 1. useChat Hook：新增 ADD_VIRTUAL_MESSAGE action

- [x] 1.1 在 chatReducer 的 ChatAction union 中新增 `ADD_VIRTUAL_MESSAGE` 类型，在 reducer 中处理该 action：构造一条 AI 消息和一条用户消息一并追加到 messages 数组
- [x] 1.2 暴露 `addVirtualMessage(intent, userContent?, options?)` 方法返回给 ScreenChat 调用

## 2. ScreenChat：修改「产品海报」「产品视频」按钮行为

- [x] 2.1 修改 `handlePosterTemplate`：调用 `addVirtualMessage('text_to_image')`，不再填充 inputValue
- [x] 2.2 修改 `handleVideoTemplate`：调用 `addVirtualMessage('generate_video')`，不再填充 inputValue

## 3. 验证

- [ ] 3.1 点击「产品海报」后对话流中出现 InlineImageCard，不跳转页面
- [ ] 3.2 点击「产品视频」后对话流中出现 InlineVideoCard（含 URL 输入框和描述输入框），不跳转页面
- [x] 3.3 虚拟消息不保存到 localStorage，刷新后消失
- [x] 3.4 发送真实消息时，conversation_history 不包含虚拟消息
