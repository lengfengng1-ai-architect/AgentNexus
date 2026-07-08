## Why

InlineImageCard 生成图片后显示"全屏查看"和"重新生成"两个按钮。用户无法直接复制图片 URL 用于其他地方（如 ChatInput 附件插入、外部使用）。需要补充"复制链接"按钮，方便用户快速获取 image_url。

## What Changes

- **InlineImageCard**: 图片结果区域增加"复制链接"按钮，点击后复制 `result.image_url` 到剪贴板，短暂显示"已复制"反馈
- 无后端改动，无 API 改动

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- 无（纯 UI 增强）

## Impact

- **Frontend**: 仅修改 `frontend/src/components/InlineImageCard.tsx`，在按钮区域增加一个复制按钮
