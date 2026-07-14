## 1. MobileWorkbenchPage：删除 handleChatNavigate 中的 setBriefData

- [x] 1.1 handleChatNavigate 中删除 setBriefData(...) 调用，仅保留 setPendingChatData

## 2. MobileWorkbenchPage：topbar 增加 pendingChatData 回退

- [x] 2.1 brandLabel 回退：briefData 为空时从 pendingChatData.brandInput 读取 brand_name

## 3. 验证

- [x] 3.1 ChatBubble「生成方案」→ 跳转简报，topbar 显示对应品牌名，③ 方案生成屏保持 idle
- [x] 3.2 Tab「方案生成」→ 跳转简报，topbar 显示空值，③ 方案生成屏保持 idle
- [x] 3.3 简报「✦ AI 生成方案」→ ②→③ 跳转并触发流水线
