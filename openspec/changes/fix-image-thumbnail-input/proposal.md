## Why

当前多图输入依赖多行 textarea，用户无法逐个输入 URL 并即时获得缩略图反馈。需改为单行输入框 + 自动追加空行的交互模式，并修复 ImageThumbnail 图片持续显示"加载中"的 bug。

## What Changes

- **ImageThumbnail 组件修复**：移除 `display: none` + `loading="lazy"` 的组合，改用 `opacity` 控制显隐，确保图片请求被发起
- **输入交互重构**：从单 textarea 改为多行独立 URL input，每行输入框聚焦时按行解析，新增空 URL 行自动追加
- **状态管理**：`imageUrlInput: string` + `parseImageUrls` → 直接管理 `urlRows: string[]` 数组

## Capabilities

### Modified Capabilities
- `video-generation`: 图片 URL 输入交互从 textarea 改为行级输入，auto-append 空行

## Impact

- `frontend/src/pages/VideoTestPage.tsx` — ImageThumbnail 组件修复 + 输入交互重构
- `frontend/src/hooks/useChat.ts` — 无需改动（导航传递不变）
