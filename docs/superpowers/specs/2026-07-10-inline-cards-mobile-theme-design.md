# 生图/生视频卡片移动端主题适配

## 背景

InlineImageCard 和 InlineVideoCard 两个组件位于 `components/` 目录下，使用桌面端 Tailwind token（`bg-mist`、`border-line`、`bg-start`）。ScreenChat 复用 ChatBubble 后，这两个卡片随气泡出现在移动端 PhoneFrame（`.mw` 蓝色 `#1677ff` 调色板）中，在颜色、比例间距、字体大小三方面与移动端风格不协调。

## 方案

采用 **variant prop** 方式：ChatBubble 新增 `variant?: 'mobile'` prop，透传给 InlineImageCard / InlineVideoCard。`variant === 'mobile'` 时组件内部用三元组切换色值、字号、间距。

## 色值映射

| 元素 | 桌面 | 移动端 |
|---|---|---|
| 卡片背景 | `bg-mist/50` | `bg-[#f7f8fa]` |
| 卡片边框 | `border-line` | `border-[#d9dee7]` |
| 主按钮背景 | `bg-start` | `bg-[#1677ff]` |
| 主按钮 hover | `hover:bg-start/90` | `hover:bg-[#1677ff]/90` |
| 次按钮边框 | `border-line` | `border-[#d9dee7]` |
| 标签/说明文字 | `text-track/50` | `text-[#6b7280]` |
| 输入框边框 | `border-line` | `border-[#d9dee7]` |
| 输入框 focus | `focus:border-start` | `focus:border-[#1677ff]` |
| 禁用态背景 | `bg-line` | `bg-[#d9dee7]` |

## 字号与间距

| 元素 | 桌面 | 移动端 |
|---|---|---|
| 卡片内边距 | `p-3` (12px) | `p-2.5` (10px) |
| 主体字号 | `text-xs` (12px) | `text-[11px]` |
| label 字号 | `text-[10px]` | `text-[9px]` |
| 生成按钮字号 | `text-sm` (14px) | `text-xs` (12px) |

## 改动文件

- `ChatBubble.tsx` — 新增 `variant` prop + 透传
- `InlineImageCard.tsx` — 接收 variant，三元切换样式
- `InlineVideoCard.tsx` — 同上
