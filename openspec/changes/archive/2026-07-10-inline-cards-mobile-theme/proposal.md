## Why

InlineImageCard 和 InlineVideoCard 两个参数卡片在移动端 PhoneFrame 中出现时，使用桌面端 token 色系（`bg-mist`/`border-line`/`bg-start`），与移动端 `.mw` 蓝色 `#1677ff` 调色板在颜色、间距比例、字体大小三方面不协调，影响移动端展示质感。

## What Changes

- **ChatBubble** 新增 `variant?: 'mobile'` prop，透传给内嵌卡片
- **InlineImageCard** 接收 `variant` prop，`variant === 'mobile'` 时切换为移动端蓝色系色值、缩紧间距、调小字号
- **InlineVideoCard** 同上
- 桌面端行为零变化，不新增 CSS 文件，不修改 Tailwind 配置
- 参数（prompt、size、ratio、resolution、duration、seed 等）不变

## Capabilities

### New Capabilities

- `inline-cards-mobile-theme`: InlineImageCard / InlineVideoCard 在移动端环境（`.mw` 作用域）下的视觉主题适配，通过 variant prop 驱动

### Modified Capabilities

- `inline-image-gen`: InlineImageCard 新增移动端视觉变体
- `inline-video-gen`: InlineVideoCard 新增移动端视觉变体

## Impact

- `frontend/src/components/ChatBubble.tsx` — 新增 `variant` prop + 透传
- `frontend/src/components/InlineImageCard.tsx` — 接收 variant，三元切换样式
- `frontend/src/components/InlineVideoCard.tsx` — 同上
- `frontend/src/__tests__/ChatInput.test.tsx` — 无影响（不涉及卡片）
- 不新增依赖，不修改后端
