## Context

ChatInput 组件的加号菜单面板（`showMenu` 状态下的浮层）当前被外层容器的 `overflow-hidden` CSS 属性裁剪，导致所有菜单项不可见。问题源于此前重构时将 `overflow-hidden rounded-2xl` 应用到包襄整个输入区（附件预览条 + 主输入行）的外层容器，但菜单面板使用 `absolute bottom-full` 向上弹出，被 `overflow-hidden` 截断。

当前布局结构概览：

```
div.rounded-2xl.overflow-hidden    ← 问题：overflow 裁剪了菜单
├── div.border-b (附件预览条)
└── div.flex (主输入行)
    └── div.relative
        ├── ➕ 按钮
        └── div.absolute.bottom-full (菜单) ✂️ 🔴
```

## Goals / Non-Goals

**Goals:**
- 加号菜单面板在点击 ➕ 后正确定位、可见
- 菜单项保持现有样式和交互（点击项关闭菜单、点击外部关闭等）

**Non-Goals:**
- 不改变菜单的任何功能行为
- 不改动现有状态逻辑（`showMenu`、`handlePlusClick`、`handleAttachClick` 等）
- 不引入第三方组件或库

## Decisions

**方案：独立锚点容器**

在 `overflow-hidden` 容器外部的同一层级新增一个 `<div ref={menuAreaRef}>` 作为菜单定位锚点。原有逻辑：
1. 保持外层 `overflow-hidden` 不变（附件预览条需要它来保持圆角剪裁）
2. 将 `menuAreaRef` 从输入行内部的 `div.relative` 移到外层独立容器
3. 菜单面板在独立容器内使用 `absolute bottom-full left-0` 定位，仍相对按钮位置弹出
4. 按钮自己 (`➕`) 仍需保持与外层容器中，但菜单面板的 DOM 另起一个 portal-style 结构

等等——这个方案有问题。菜单面板需要知道➕按钮的位置才能正确定位 `bottom-full left-0`。如果菜单面板和按钮不在同一个 relative 容器中，它无法通过 CSS 定位对齐到按钮。

**正确方案：去掉容器级的 `overflow-hidden`，改用 `overflow-hidden` 仅在附件预览条区域**

实际上最简单且正确的做法是：

1. 去掉包裹整体输入的容器上的 `overflow-hidden` 和 `rounded-2xl`
2. 改为在输入行容器上单独加 `rounded-2xl`，或者在主输入行和附件预览条各自独立加圆角
3. 菜单面板仍然在原有的 `div.relative` 中，不再被 `overflow` 限制

但这样会失去两个子区域统一的外框 border-radius。更好的做法：

**最终方案：拆分容器，菜单面板脱离 overflow 范围**

```
div.max-w-3xl                        ← 新锚点位置
├── div.rounded-2xl.border           ← 输入容器（无 overflow）
│   ├── (附件预览条)
│   └── div.flex (主输入行)
│       └── div.relative (按钮锚点)
│           └── ➕ 按钮（仅按钮，菜单移出）
└── div.relative (独立菜单锚点)       ← 🆕
    └── div.absolute.bottom-full (菜单)
```

但这需要菜单面板的 CSS 定位知道按钮的位置。

**简化方案（推荐）：**

替代方案是 CSS-only 解决：保留现有 DOM 结构，仅移除外层容器的 `overflow-hidden`，改为 `overflow-clip`（只 clip 垂直方向不影响 absolute 弹出）。但 `overflow-clip` 和 `overflow-hidden` 行为一致。

最简洁的方案：**移除外层 `overflow-hidden`，在输入行和附件预览条各自独立设置 `overflow-hidden`**

```
div.rounded-2xl.border.border-line.THIS         ← 移除 overflow-hidden
├── div.border-b (附件预览条) overflow-hidden    ← 需要圆角裁剪的地方加
└── div.flex (主输入行)                          ← 不加 overflow
    └── div.relative
        ├── ➕ 按钮
        └── div.absolute.bottom-full (菜单) ✓
```

这样菜单不再受父级 overflow 限制。外层容器的 `rounded-2xl` 配合 `border` 仍然显示圆角边框，唯一副作用是预览条内容溢出时不裁剪——但预览条本身没有会溢出的内容。

**替代方案：React Portal**
将菜单面板通过 React Portal 渲染到 `document.body`，通过 `useLayoutEffect` 计算按钮位置后绝对定位。缺点是定位需要额外同步逻辑，且滚动/窗口变化时需重新计算。引入复杂度超出该 bug 所需。

## Risks / Trade-offs

- 移除 `overflow-hidden` 后，如果附件预览条内容超出容器宽度，可能破坏外层圆角视觉效果。缓解方案：在附件预览条区域单独加 `overflow-hidden`。
- 该改动只涉及 CSS，不影响任何状态逻辑和测试。
