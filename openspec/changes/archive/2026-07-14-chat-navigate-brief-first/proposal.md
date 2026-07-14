## Why

点击 ChatBubble「生成方案」或 Tab「方案生成」时，期望跳转到 ② 简报屏让用户精修再提交。但当前 handleChatNavigate 中 setBriefData 触发了 ScreenGenerate 的 start() 自启动 useEffect，导致流水线在用户还在编辑简报时就已在后台运行。

## What Changes

- **删除 handleChatNavigate 中的 setBriefData 调用**：ChatBubble「生成方案」跳转简报时不再设置 briefData，仅保留 pendingChatData 用于 ScreenBrief 预填
- **topbar 品牌标签从 pendingChatData 回退读取**：当 briefData 为空但 pendingChatData 有值时，topbar 显示从 pendingChatData 解析的品牌/产品名
- **ScreenGenerate 的 auto-start 语义保持不变**：仅当从 ② 简报屏「✦ AI 生成方案」按钮提交（handleNavigate → setBriefData → setScreen('generate')）时才触发流水线

## Capabilities

### New Capabilities

- （无）

### Modified Capabilities

- `mobile-workbench-preview`：② 简报屏 → ③ 方案生成的导航流程语义纠正：ChatBubble/Tab「生成方案」仅跳转简报，不触发流水线；仅简报屏「✦ AI 生成方案」按钮触发流水线

## Impact

- `frontend/src/pages/mobile-workbench/MobileWorkbenchPage.tsx` — handleChatNavigate 去掉 setBriefData，topbar 品牌标签增加 pendingChatData 回退
