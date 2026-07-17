# Tasks: mobile-media-cards-redesign

## 1. 移动端卡片 CSS 基础设施

- [x] 1.1 新建 `frontend/src/components/inline-media-mobile.css`：定义 `.mw` 作用域的 `.imc-card`（白底/细边框/轻阴影/16px 圆角）、`.imc-title-row`、`.imc-textarea`、`.imc-chip`/`.imc-chip.on`、`.imc-cta`（全宽 accent 胶囊按钮）、`.imc-result-actions`（muted 文字链接行）、`.imc-skeleton`（shimmer 动画）、`.imc-meta-line`（参数小字行）
- [x] 1.2 在 `ChatBubble.tsx` 或组件入口引入该 CSS，确认 `.mw` 作用域隔离不影响 PC 端

## 2. InlineImageCard 移动端重设计

- [x] 2.1 编辑态：mobile 分支换用 `.imc-*` 类 —— 标题行（🖼 生成图片 + 右侧 AI 优化按钮）、hairline 分隔、textarea 字号 ≥12px、尺寸 chip 选中态 accent 实底白字、生成按钮全宽胶囊
- [x] 2.2 加载态：改为跟随所选尺寸比例的 `.imc-skeleton` 骨架屏 + 一行状态文字，移除居中大转圈
- [x] 2.3 完成态：去灰底容器，图片大圆角撑满卡片宽，下方一行 muted 文字链接（全屏 · 复制链接 · 重新生成），全屏 overlay 逻辑保留

## 3. InlineVideoCard 移动端重设计

- [x] 3.1 编辑态：mobile 分支换用 `.imc-*` 类 —— 标题行（🎬 生成视频 + 右侧 AI 优化按钮）、缩略图条圆角、textarea 字号 ≥12px、参数折叠面板样式对齐、生成按钮全宽胶囊
- [x] 3.2 完成态：去灰底容器，视频大圆角展示，参数收敛一行（`720P · 16:9 · 5s`），操作一行 muted 文字链接（全屏 · 重新生成）

## 4. ReasoningBox 独立思考小卡

- [x] 4.1 在 `ChatBubble.tsx` 新增 `ReasoningBox` 组件：标题行「💭 思考中…」+ 固定高度（6.5em）内容区，overflow-y auto，text 变化时自动滚底；打字机逻辑从 `TypingReasoning` 迁入
- [x] 4.2 流式分支：mobile variant 下 `isStreaming && message.reasoning` 渲染 `ReasoningBox`；无 reasoning 回退 `TypingIndicator`；PC 分支保持原样；INTENT 到达后小卡随流式消息消失（不持久化、不渲染到正式消息）

## 5. 验证

- [x] 5.1 `pnpm tsc --noEmit` 与 `pnpm build` 通过
- [x] 5.2 浏览器预览移动端对话屏：触发产品海报/产品视频卡片，验证编辑态/加载态/完成态样式；上传图片走一轮以图生图/生视频
- [x] 5.3 验证流式思考小卡固定高度不撑开列表、INTENT 到达后消失且刷新后不可见；验证 PC 端卡片样式无变化
- [x] 5.4 code-reviewer 审查改动的 4 个文件
