## Context

ChatInput 附件上传区展开后，拖入区域与输入区域之间有 `border-b border-line` 分隔线，且背景色不同（`bg-mist/50` vs `bg-mist`），视觉效果割裂。

当前 DOM 结构：

```
div.rounded-2xl.border
├── div.overflow-hidden.rounded-t-2xl.border-b.border-line.bg-mist/50  ← 分隔线 + 半透明背景
│   └── (附件内容)
└── div.flex.bg-mist.p-2                                               ← 输入行，实色背景
```

## Goals / Non-Goals

**Goals:**
- 去掉附件区与输入区之间的分隔线
- 统一两区域的背景色
- 保持功能行为不变

**Non-Goals:**
- 不做其他样式调整
- 不涉及功能逻辑变更

## Decisions

**方案：移除 border-b + 统一背景色**

两处改动：
1. 附件预览条 div 上去掉 `border-b border-line` → 去掉分隔线
2. `bg-mist/50` 改为 `bg-mist` → 统一实色背景

修改后：

```
div.rounded-2xl.border
├── div.overflow-hidden.rounded-t-2xl.bg-mist
│   └── (附件内容)
└── div.flex.bg-mist.p-2
```

无其他可行方案 — 这就是最简修改。

## Risks / Trade-offs

- 无风险。纯 CSS 变化，不影响功能逻辑。
- 移除了分隔线后，空态提示与输入框之间仍由 `rounded-2xl` 外边框统一包襄，视觉上是一个整体。
