## 1. 修复菜单面板 overflow 裁剪

- [x] 1.1 将外层包襄容器的 `overflow-hidden` 移动到附件预览条区域（仅在附件预览条 div 上加 `overflow-hidden`，移除外层容器的该属性），使菜单面板不再受父级裁剪
- [x] 1.2 验证菜单面板正常弹出，位置和样式不变
- [x] 1.3 运行 ChatInput 测试，确认全部通过（25 tests）
