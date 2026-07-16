# 移动端聊天界面视觉升级 — Tasks

## 设计阶段

- [x] T1: 整理需求并输出 design doc 到 `docs/superpowers/specs/`
- [x] T2: 查询 CodeGraph 确认现有移动端聊天界面结构
- [x] T3: 读取 `docs/superpowers.yaml` 确认能力范围
- [x] T4: 创建 OpenSpec 变更 `mobile-chat-ui-redesign` 并输出 proposal/design/specs/tasks
- [x] T5: 与用户确认设计决策（浅色主题、Hi 老板、刷新图标、7 文案、不收键盘、emoji、光晕、顶部不变）

## 实现阶段（待 /opsx:apply 后执行）

- [x] T6: 在 `mobile-workbench.css` 中新增 ScreenChat 浅色主题样式
  - `.chat-screen` 背景渐变 + 品牌蓝光晕
  - `.suggestion-header` 推荐区样式
  - `.chat-input-bar` 输入框组合样式
  - `.chat-action-panel` 底部面板样式
  - 动效 keyframes（淡入、上滑、+ 号旋转）
  - 顶部栏保持原系统样式，不做改动

- [x] T7: 创建 `frontend/src/pages/mobile-workbench/screen-chat/ChatSuggestionHeader.tsx`
  - 接收 `prompts`、`onPromptClick`、`onRefresh` props
  - 渲染 "Hi, 老板" 问候语和 "让复杂，变简单" 副标题
  - 渲染 4 个推荐卡片（emoji 图标 + 文案 + 箭头）
  - 渲染 "🔄 换一批" 按钮
  - 进入动画：容器淡入上移 + 卡片 stagger

- [x] T8: 创建 `frontend/src/pages/mobile-workbench/screen-chat/ChatActionPanel.tsx`
  - 接收 `isOpen`、`onClose`、`onUpload`、`onCreateImage`、`onCreateVideo` props
  - 渲染底部滑出面板（装饰条 + 3 个图标按钮）
  - 动画：translateY 滑入/滑出
  - 点击外部关闭（通过 ScreenChat 控制）

- [x] T9: 创建 `frontend/src/pages/mobile-workbench/screen-chat/ChatInputBar.tsx`
  - 接收 `value`、`onChange`、`onSend`、`onVoice`、`onToggleActionPanel`、`isActionPanelOpen`、`disabled` props
  - 渲染 + 号按钮、输入框、语音/发送按钮
  - + 号展开时旋转 45°
  - 空输入显示语音，有文字显示发送

- [x] T10: 重构 `frontend/src/pages/mobile-workbench/ScreenChat.tsx`
  - 移除旧版 `quick-btns` 横排
  - 新增状态：`isInputFocused`、`showActionPanel`、`suggestedPrompts`
  - 定义 `SUGGESTION_POOL`（7 个文案）和随机抽取逻辑
  - 集成 `ChatSuggestionHeader`、`ChatActionPanel`、`ChatInputBar`
  - 保持现有上传、语音、图片/视频 virtual message、市场分析模板、方案生成导航逻辑
  - 点击面板外部关闭面板
  - 顶部栏保持原系统样式，不改动

- [x] T11: 更新/新增测试
  - 更新 `frontend/src/__tests__/ChatInput.test.tsx`（如影响）
  - 新增/更新 `frontend/src/__tests__/ScreenChat.test.tsx`
  - 覆盖：空态聚焦显示推荐区、有消息不显示、+ 号面板展开/关闭、语音/发送切换、换一批

- [x] T12: 运行前端测试与构建验证
  - `pnpm test` 或项目对应命令
  - `pnpm build`
  - 在 PhoneFrame 内预览 360px 效果

## 收尾阶段

- [x] T13: code-reviewer 审查
- [x] T14: `/opsx:archive` 归档变更
