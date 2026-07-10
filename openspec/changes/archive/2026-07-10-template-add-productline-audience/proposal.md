## Why

方案模版目前缺少「产品线」和「目标人群」字段，导致点击 ChatBubble 的「生成方案」跳转到简报后，这两个字段没有预填。用户需要手动填写，体验不完整。

## What Changes

- ScreenChat 的「方案模版」按钮填充文本追加 `产品线是 [产品线]，目标人群 [目标人群]`
- ScreenBrief 的 `parseBriefInput()` 增加对应字段的解析映射
- 无新 API、无新组件、无新增 props

## Capabilities

### New Capabilities

无

### Modified Capabilities

- `mobile-chat-session`: 方案模版文本内容变更
- `mobile-workbench-preview`: 解析器新增字段映射

## Impact

- `frontend/src/pages/mobile-workbench/ScreenChat.tsx` — 1 行模板文本变更
- `frontend/src/pages/mobile-workbench/ScreenBrief.tsx` — 2 行正则提取新增
- 无 API / 依赖变更
