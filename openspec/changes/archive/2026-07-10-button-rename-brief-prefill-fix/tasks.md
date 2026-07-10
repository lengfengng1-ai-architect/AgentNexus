## 1. 按钮文案重命名 + 排序

- [x] 1.1 `ScreenChat.tsx` — 按钮排序改为「附件 方案简报模版 一键填充简报」
- [x] 1.2 `ScreenChat.tsx` — 文案改名：「方案模板」→「方案简报模版」、「填写简报」→「一键填充简报」

## 2. useChat 暴露 latestBrandInput

- [x] 2.1 `useChat.ts` — 返回值增加 `latestBrandInput`，使用 `getLatestBrandInput` 从 messages 中提取

## 3. BrandInput 数据传递链路

- [x] 3.1 `ScreenChat.tsx` — "一键填充简报"按钮调用 `onNavigate('brief', inputValue, latestBrandInput)`
- [x] 3.2 `MobileWorkbenchPage.tsx` — 新增 pendingBriefBrandData 暂存与透传给 ScreenBrief
- [x] 3.3 `ScreenBrief.tsx` — 新增 `initialBrandData` prop，实现多源合并逻辑（BrandInput > parse > mock）

## 4. 测试验证

- [x] 4.1 运行现有测试，确认无回归
