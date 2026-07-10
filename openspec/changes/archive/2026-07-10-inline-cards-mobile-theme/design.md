## Context

InlineImageCard 和 InlineVideoCard 两个参数组件位于 `frontend/src/components/`，使用桌面端 Tailwind token 色系（`bg-mist`、`border-line`、`bg-start` 等）。ScreenChat 复用 ChatBubble 后，这两张卡片随气泡出现在移动端 PhoneFrame（`.mw` 蓝色 `#1677ff` 调色板）中，在颜色、比例间距、字体大小三方面与移动端风格不协调。

移动端工作台的样式系统基于 CSS 变量挂载在 `.mw` 选择器下（`mobile-workbench.css`），与 PC 端 `index.css` 的 token 系统完全隔离。InlineImageCard/InlineVideoCard 是独立组件，不知道自己在什么环境中渲染，需要通过 prop 显式通知。

**约束：**
- 不修改 Tailwind 配置
- 不新增 CSS 文件
- 桌面端行为零变化
- 参数面板（prompt、size、ratio、resolution、duration、seed 等）不变

## Goals / Non-Goals

**Goals:**
- InlineImageCard 在 `variant="mobile"` 时切换为移动端蓝色系色值、缩紧间距、调小字号
- InlineVideoCard 同上
- ChatBubble 新增 `variant?: 'mobile'` prop 并透传给内嵌卡片
- ScreenChat 传入 `variant="mobile"`

**Non-Goals:**
- 不改 CSS 变量体系或 Tailwind 配置
- 不改参数面板的内容或布局结构
- 不改桌面端渲染

## Decisions

### 方案：variant prop（选定）

| 方案 | 描述 | 结论 |
|---|---|---|
| A: CSS scope 自动检测 | 通过 CSS 作用域 `.mw .inline-image-card` 自动切换样式 | 被否：组件渲染层级深，CSS 优先级难控制，!important 蔓延 |
| B: variant prop | ChatBubble 新增 `variant` prop，透传给 Card，Card 内部三元切换 | ✅ 选定。显式传参，无副作用 |

### prop 传递链：ScreenChat → ChatBubble → Card

在 ScreenChat 中传入 `variant="mobile"`，ChatBubble 透传给 InlineImageCard/InlineVideoCard。不引入 Context，保持单向数据流。

### 色值映射

| 元素 | 桌面 | 移动端 |
|---|---|---|
| 卡片背景 | `bg-mist/50` → `bg-white` | `bg-[#f7f8fa]` |
| 卡片边框 | `border-line` | `border-[#d9dee7]` |
| 主按钮背景 | `bg-start` | `bg-[#1677ff]` |
| 主按钮 hover | `hover:bg-start/90` | `hover:bg-[#1677ff]/90` |
| 次按钮边框 | `border-line` | `border-[#d9dee7]` |
| 标签/说明文字 | `text-track/50` | `text-[#6b7280]` |
| 输入框边框 | `border-line` | `border-[#d9dee7]` |
| 输入框 focus | `focus:border-start` | `focus:border-[#1677ff]` |
| 禁用态背景 | `bg-line` | `bg-[#d9dee7]` |

### 字号与间距

| 元素 | 桌面 | 移动端 |
|---|---|---|
| 卡片内边距 | `p-3` (12px) | `p-2.5` (10px) |
| 主体字号 | `text-xs` (12px) | `text-[11px]` |
| label 字号 | `text-[10px]` | `text-[9px]` |
| 生成按钮字号 | `text-sm` (14px) | `text-xs` (12px) |

## Risks / Trade-offs

- **[Prop 蔓延]** variant prop 需要沿 ScreenChat → ChatBubble → Card 传递三层。如果未来有更多环境变体（平板、折叠屏），prop 组合会膨胀。→ Mitigation：当前只有两档（桌面/移动端），膨胀时再考虑 Context。
- **[维护成本]** 三元表达式散落组件中，不如 CSS 变量统一。→ Mitigation：改动范围小（3 个文件），且 CSS 变量方案在这种跨文件层级传参中维护成本更高。
