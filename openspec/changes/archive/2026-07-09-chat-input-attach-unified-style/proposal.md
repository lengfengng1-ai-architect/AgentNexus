## Why

文件上传区域与输入框之间有一条 `border-b` 横线分隔，且两区域背景色不一致（`bg-mist/50` vs `bg-mist`），造成视觉上的硬分层，影响整体美观。这是一个纯 CSS UI 打磨，去掉分隔线并统一背景色，使两个区域融为一体。

## What Changes

- 移除附件预览条的 `border-b border-line`（分隔线）
- 附件预览条背景色从 `bg-mist/50` 改为 `bg-mist`，与输入行背景统一

不涉及任何功能行为变更。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

无 — 纯 UI 调整，不涉及 requirement 变更。

## Impact

- **前端文件**: `frontend/src/components/ChatInput.tsx` — 仅两处 CSS class 修改
- 不涉及后端、API、依赖、测试
