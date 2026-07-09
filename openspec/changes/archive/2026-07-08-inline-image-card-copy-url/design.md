## Context

InlineImageCard 生成图片后展示 button row，包含"全屏查看"和"重新生成"。需增加"复制链接"按钮。

## Decisions

- 使用 `navigator.clipboard.writeText()` API 复制 `result.image_url`
- 复制成功后按钮文字短暂变为"已复制"（800ms 后恢复），提供即时反馈
- 按钮置于现有 button row 中，"全屏查看"左侧或右侧均可
- 不需要 Clipboard API 权限声明（HTTPS 或 localhost 下自动可用）
