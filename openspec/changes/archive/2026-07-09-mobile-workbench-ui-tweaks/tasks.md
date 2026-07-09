## 1. 移动端按钮右移

- [x] 1.1 将 App.tsx NAV 数组中 `mobile` 条目从 `intent` 之前移至之后
- [x] 1.2 启动前端预览确认导航顺序变为「对话 → 工作台 → 测试 ▼ → 移动端」

## 2. 对话入口快捷键行

- [x] 2.1 在 ScreenChat.tsx 中添加 `fileInputRef`、`handleVoice`、`handlePrefillTemplate`、`handleFileSelect` 逻辑
- [x] 2.2 在 `.chat` 和 `.inputbar` 之间添加快捷键行 JSX（填写简报、语音输入、附件、方案模板）
- [x] 2.3 在 mobile-workbench.css 添加快捷键行样式（flex 行 + 圆角标签 + 隐藏 input）
- [x] 2.4 启动预览确认各按钮功能正常

## 3. 简报底部去除提示文本

- [x] 3.1 删除 ScreenBrief.tsx 中 `.dock` 内的 `.hint` div
- [x] 3.2 将 CSS `.dock` 改为 `justify-content: center`
- [x] 3.3 启动预览确认按钮居中显示
