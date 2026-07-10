## Why

移动端工作台①对话屏的快捷按钮文案和排序需要调整；同时"一键填充简报"功能存在 bug——当前仅从输入框当前文本正则提取字段，对话历史中后端已返回的结构化 BrandInput 数据未被使用，导致即使对话中包含完整品牌信息，跳转简报后仍显示默认 mock 数据。

## What Changes

1.「方案模板」→「方案简报模版」文案改名
2.「填写简报」→「一键填充简报」文案改名
3. 快捷按钮排序由「填写简报 附件 方案模板」改为「附件 方案简报模版 一键填充简报」
4. `onNavigate` 签名扩展支持传入 `brandData`（BrandInput 结构化字段）
5. `useChat` 暴露 `latestBrandInput`
6. `ScreenBrief` 合并使用 BrandInput 结构化数据（最高优先级）+ 输入框文本 parse 结果（补充）+ mock 默认值（兜底）

## Capabilities

### New Capabilities

- `mobile-brief-prefill-from-brandinput`: 从对话意图识别结果（BrandInput）自动预填简报表单字段

### Modified Capabilities

- `mobile-chat-session`: ADDED 按钮文案/排序 + onNavigate 签名扩展 + brandData 传递
- `mobile-workbench-preview`: ADDED ScreenBrief 支持 initialBrandData prop + 多源合并预填

## Impact

- `ScreenChat.tsx` — 按钮文案、排序、onNavigate 多传 brandData
- `MobileWorkbenchPage.tsx` — 新增 pendingBriefBrandData 暂存与透传
- `ScreenBrief.tsx` — 新增 initialBrandData prop，多源合并逻辑
- `useChat.ts` — 暴露 latestBrandInput
