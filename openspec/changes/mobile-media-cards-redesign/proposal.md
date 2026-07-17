# Proposal: mobile-media-cards-redesign

## Why

移动端聊天界面整体已获用户认可，但图片/视频生成卡片仍是桌面端表单的压缩版（灰底硬边框 + 9–11px 小字 + 一排小方按钮），与聊天区玻璃拟态视觉语言割裂，用户反馈「有点丑」；同时流式思考过程直接混在正文容器中逐字追加，气泡高度无界增长，持续撑开并抖动整个消息列表。

## What Changes

- 重设计 `InlineImageCard` / `InlineVideoCard` 的 **mobile variant** 样式：纯白卡片基底 + 细边框 + 轻阴影（弃用灰底硬边框），层级靠留白和 hairline，字号提升，chip 选中态改 accent 实底白字，生成按钮改全宽胶囊
- 重设计两张卡片的**完成态**：去掉灰底容器，图片/视频直接大圆角展示，操作收敛为一行 muted 文字链接（全屏 · 复制链接 · 重新生成），视频参数收敛为一行 `720P · 16:9 · 5s`
- 图片加载态从居中大转圈改为骨架屏占位
- **思考过程（reasoning）展示**拆为独立小卡：标题行「💭 思考中…」+ **固定高度**内容区（内部滚动跟随最新内容）；仅流式期间存在，INTENT 到达后消失，不持久化、刷新后不可回看
- 纯样式/结构重设计：不改数据流、不改 API、不改 PC 端样式、不改后端

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `inline-image-gen`: 移动端卡片编辑态/加载态/完成态的视觉呈现要求变更（仅 mobile variant，PC 样式不变）
- `inline-video-gen`: 移动端卡片编辑态/完成态的视觉呈现要求变更（仅 mobile variant，PC 样式不变）
- `mobile-chat-session`: 新增流式思考过程的展示要求（独立小卡、固定高度、完成后折叠）—— 该能力此前未覆盖 reasoning 展示

## Impact

- **前端代码**：`frontend/src/components/InlineImageCard.tsx`、`frontend/src/components/InlineVideoCard.tsx`、`frontend/src/components/ChatBubble.tsx`（reasoning 分支）、新增移动端专属 CSS（挂在 `screen-chat.css` 或独立文件）
- **in_scope**：`video-generation`（视频生成卡片样式）；图片生成链路已存在，本次仅样式重设计
- **后端 / API**：无改动
- **mock 数据**：不涉及（纯前端样式，预览验证用现有本地图片/视频 URL 即可）
- **依赖**：无新增依赖
- **PC 端**：不受影响（仅改 `variant === 'mobile'` 分支与 `.mw` 作用域 CSS）

## Non-goals

- 不改 PC 端（无 variant）卡片样式
- 不改生成参数项（尺寸/比例/分辨率/时长/种子）本身，只改其呈现
- 不引入新组件库或动画库
- 不涉及方案自动执行等 out_scope 能力
