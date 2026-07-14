## Context

当前导航流程存在一个回归问题：上一次 change (`brief-auto-fill-state-sync`) 在 `handleChatNavigate` 中新增了 `setBriefData`，目的是让 topbar 显示正确的品牌名。但 `briefData` 同时也是 `ScreenGenerate` 的 auto-start useEffect 的触发器——`ScreenGenerate` 虽然在 `display:none` 隐藏状态下，但其 useEffect 依然运行，检测到 `briefData` 非空且 `status === 'idle'` 时自动调用了 `start(brandInput)`。

流程追踪：
```
ChatBubble「生成方案」→ handleChatNavigate('brief', inputText, brandInput)
  → setPendingChatData(...)         // ScreenBrief 预填 ← 正确的
  → setBriefData(...)               // 触发 ScreenGenerate auto-start ← 错误的
  → setScreen('brief')              // Tab 切换到 ② 简报

ScreenGenerate (hidden display:none) useEffect:
  briefData 非空 + status === 'idle' → start(brandInput)  → 流水线已在后台运行
```

期望流程：
```
ChatBubble「生成方案」→ handleChatNavigate('brief', inputText, brandInput)
  → setPendingChatData(...)     // ScreenBrief 预填
  → setScreen('brief')          // 用户编辑简报
  → 用户点击「✦ AI 生成方案」    // 手动触发
  → handleNavigate('generate', data) → setBriefData(data) → setScreen('generate')
  → ScreenGenerate auto-start   // 正确触发流水线
```

## Goals / Non-Goals

**Goals:**
- ChatBubble「生成方案」/ Tab「方案生成」→ 仅跳转到 ② 简报屏，不触发流水线
- ② 简报屏点击「✦ AI 生成方案」→ 跳转 ③ 方案生成屏 + 触发流水线
- Topbar 在跳转简报屏的瞬间正确显示品牌名（即使 briefData 为空）
- ScreenGenerate 的 auto-start 逻辑不变（仍响应 briefData 变化）

**Non-Goals:**
- 不改动 ScreenBrief 的预填逻辑（pendingChatData 不变）
- 不改动 ScreenGenerate 的 auto-start useEffect
- 不改动 handleTabClick（Tab 直接跳转简报已正确清零数据）

## Decisions

### 方案 A：删除 handleChatNavigate 中的 setBriefData，topbar 增加 pendingChatData 回退（选此方案）

**做法：**
1. `handleChatNavigate` 中去掉 `setBriefData(...)` 调用，仅保留 `setPendingChatData`
2. `briefData` 为 null 时 topbar 从 `pendingChatData` 回退解析品牌/产品名
3. topbar 回退逻辑用之前已存在的 `parseProductLabel` 和新增的 `parseBrandLabel` 帮助函数

**优点：**
- 影响范围最小，只改 MobileWorkbenchPage.tsx 一个文件
- ScreenGenerate auto-start 逻辑完全不需修改
- ScreenBrief 预填不受影响

**风险：**
- topbar 品牌名在 SessionStorage 的意义上更加「装饰性」，`pendingChatData` 可能被用户关闭 tab 后过期，但场景不常见

### 方案 B：ScreenGenerate 增加是否 visible 的判别条件

**做法：** 给 ScreenGenerate 加一个 `visible` prop 或从 `display:none` 推断是否可见，不可见时不启动流水线。

**不选理由：** `display:none` 是 MobileWorkbenchPage 的切换方式，引入 visible 判别增加复杂度，且与 handleTabClick 的跳转路径竞争。

## Risks / Trade-offs

- **[Topbar 在 Tab「方案生成」跳转时显示空值]** → 这是预期行为。Tab 方案生成跳转时 handleTabClick 已清除所有数据，topbar 显示空值，用户填写表单后进入 generate 屏才会有 brand 信息。
- **[ChatBubble「生成方案」跳转后 briefData 为空不影响流程]** → ScreenBrief 通过 pendingChatData 预填，用户点击「✦ AI 生成方案」时 setBriefData(data) 将数据传递到 generate 屏。不会丢失数据。
