## Context

ChatBubble 中「生成方案」按钮的 `onGeneratePlan` 回调当前签名为 `() => void`，调用时无法获知点击的是哪条消息。点击后仅跳转到简报屏，表单字段始终保持 mock 默认值。

之前的 button-rename-brief-prefill-fix change 实现了从快捷按钮（一键填充简报 → 方案生成）携带数据预填，但 ChatBubble 中的「生成方案」在 transition 到 `onNavigate('brief')` 时丢失了所有上下文。

## Goals / Non-Goals

**Goals:**
- ChatBubble 的「生成方案」点击后携带 `brandInput` 和 `content` 数据到简报屏
- ScreenBrief 根据 ChatBubble 携带的数据预填品牌/品类/城市等字段
- 同一个消息上既有 `brandInput` 又有 `canGeneratePlan` 时才能触发预填

**Non-Goals:**
- 不改动后端 API
- 不改动 MobileWorkbenchPage 的 topbar 动态更新逻辑
- 不涉及 ScreenBrief → ScreenGenerate 的 AI 生成流程

## Decisions

### 1. onGeneratePlan 改为携带 messageId

`ChatBubble.tsx` 的 `onGeneratePlan` 从 `() => void` 改为 `(messageId: string) => void`，ScreenChat 根据 messageId 找到对应消息提取 `brandInput` 和 `content`。

替代方案：直接传 `brandInput` 对象给回调。缺点是回调签名耦合了数据类型，而 messageId 更通用。

### 2. MobileWorkbenchPage 用 pendingChatData 中转

MobileWorkbenchPage 新增 `pendingChatData: { inputText: string; brandInput: BrandInput } | null` state：
- `handleNavigate('brief', inputText, brandInput)` 时暂存
- 渲染 `<ScreenBrief>` 时作为 props 传入
- 切换到其他屏时清空

### 3. ScreenBrief 接收 initialInput / initialBrandData props

从之前的 change 中已有 `parseBriefInput` 和 merge 逻辑。ScreenBrief 新增 props：
- `initialInput?: string` — 消息的 content 文本（可选，用于 regex 解析）
- `initialBrandData?: BrandInput` — 消息的 brandInput 结构化数据

合并优先级: `initialBrandData` 的具体字段 > `parseBriefInput(initialInput)` 提取 > mock 默认值

## Risks / Trade-offs

- [低] ScreenBrief 已有 hardcoded 默认值，新增 props 后初始化逻辑需从 useState 改为 useMemo+useState 联动 — 确保已存在的直接 Tab 跳转行为不受影响（无 props 时仍用默认值）
