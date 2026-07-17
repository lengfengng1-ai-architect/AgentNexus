# Design: mobile-media-cards-redesign

## Context

移动端聊天界面（`ScreenChat` + `ChatBubble` mobile variant）已完成玻璃拟态重设计并获用户认可。但对话流内的两张媒体生成卡片（`InlineImageCard` / `InlineVideoCard`）仍是早期桌面端样式压缩版：灰底 `#f7f8fa` + 硬边框 `#d9dee7` + 9–11px 小字 + 一排小方按钮，与聊天气泡视觉语言割裂。

另外，流式 reasoning（`TypingReasoning`）直接渲染在正文 `whitespace-pre-wrap` 容器内逐字追加，气泡高度随内容无界增长，持续撑开并抖动消息列表。

约束：
- 只改 `variant === 'mobile'` 分支；PC 端（`ChatContainer` 使用同一 `ChatBubble`，无 variant）样式不变
- 不改数据流（API、SSE、结果回写 `onImageResult`/`onVideoResult`、localStorage 持久化）
- 移动端设计 token 已存在：`--accent #1677ff`、`--surface`、`--border`、`--muted`、`--r-*`；`.mw` 作用域 CSS 在 `screen-chat.css` / `mobile-workbench.css`
- 现有组件用 Tailwind 工具类内联；移动端气泡样式覆盖在 `screen-chat.css` 的 `.mw .chat-messages` 作用域

## Goals / Non-Goals

**Goals:**
- 移动端媒体卡片编辑态/加载态/完成态换为纯白卡片视觉（白底 + 细边框 + 轻阴影 + 16px 圆角），层级靠留白与 hairline
- reasoning 拆为独立小卡，固定高度 + 内部滚动，完成后折叠一行
- 不触碰 PC 端任何样式

**Non-Goals:**
- 不改生成参数项、不改 API、不改后端
- PC 端样式重设计（留待用户另行提出）
- 引入新组件/动画库

## Decisions

### D1: 移动端样式用「专属 CSS 类」而非继续堆 Tailwind 内联

现状是两个卡片组件每个元素都有 `isMobile ? '...' : '...'` 三元串，本次重设计后 mobile 与 PC 差异更大，继续内联三元会让 JSX 不可读。

决策：新增 `frontend/src/components/inline-media-mobile.css`（或在 `screen-chat.css` 追加一个区块），定义 `.mw .imc-card`（容器）、`.imc-title-row`、`.imc-textarea`、`.imc-chip` / `.imc-chip.on`、`.imc-cta`、`.imc-skeleton`、`.imc-result-actions` 等类；组件内 mobile 分支只写 `className="imc-card"` 等短类名。PC 分支保留现有 Tailwind 类不动。

理由：差异收敛在一处、`.mw` 作用域天然隔离 PC；复用现有 `--*` token 与气泡圆角语言。

备选：继续 Tailwind 三元内联 —— 否决，mobile/PC 样式差异翻倍后 JSX 臃肿难审。

### D2: 卡片基底选纯白卡片，不选玻璃拟态

聊天气泡本身是白底（`--surface`/`#fff`），玻璃叠玻璃在半透明白上会糊成一团、边界不清。纯白卡片 + 1px `--border` + `0 2px 12px rgba(10,36,80,.06)` 轻阴影 + `var(--r-lg)` 圆角，与 iOS 原生卡片一致，对比清晰。

### D3: reasoning 渲染为独立组件 `ReasoningBox`，仅存在于流式期间

`ChatBubble` 中 `isStreaming` 分支从「reasoning ? TypingReasoning : TypingIndicator」改为渲染 `<ReasoningBox text={message.reasoning} />`：

```
┌────────────────────────────┐
│ 💭 思考中…                  │  ← 标题行 12px muted
│ ┌────────────────────────┐ │
│ │（固定高 104px, overflow- │ │  ← 13px muted 文字
│ │  y:auto, 滚到底跟随)    │ │
│ └────────────────────────┘ │
└────────────────────────────┘
```

- 固定高度用 em 基准（6.5em，约 5 行 13px/1.6），不是 max-height —— 保证流式期间气泡总高恒定
- 自动滚底：`useEffect` 在 text 变化时 `el.scrollTop = el.scrollHeight`
- 打字机逐字效果保留（`TypingReasoning` 逻辑移入 ReasoningBox 内容区）
- **仅流式期间存在**：`INTENT_RECEIVED` 时流式消息被正式消息替换，思考小卡随之消失；不渲染到正式消息、不持久化到 localStorage（刷新后不可回看——用户明确要求）

### D4: 图片加载态骨架屏比例跟随所选尺寸

`size` state 已知（`2048*2048` 等），骨架屏用 `aspect-ratio: w/h` + shimmer（线性渐变位移动画，纯 CSS），替代 `py-6` 居中转圈。视频生成已有进度条，不动。

### D5: 完成态操作收敛为文字链接行

图片：`全屏 · 复制链接 · 重新生成`（12px `--muted`，`·` 分隔，点击区域 padding 加大保证触控）；视频：`全屏 · 重新生成` + 参数行 `720P · 16:9 · 5s`。去掉三个小方按钮和灰底容器。全屏 overlay 逻辑不变。

## Risks / Trade-offs

- [固定高 6.5em 内容区在长思考时只显示末尾] → 有意为之：内部滚动跟随最新，流式结束后即消失
- [`.mw` 作用域 CSS 与组件内 Tailwind 类优先级冲突] → 新类名全部加 `.mw` 前缀提高优先级，mobile 分支不再写冲突的 Tailwind 类
- [骨架屏 aspect-ratio 在极老浏览器不支持] → 目标为移动端现代浏览器，可接受；降级为默认 1:1

## Open Questions

（无）
