## Context

移动端聊天有两个推荐表面，当前内容重复：
- `sg-scroll` 药丸（[ChatSuggestionHeader.tsx](frontend/src/pages/mobile-workbench/screen-chat/ChatSuggestionHeader.tsx)）：空态未聚焦，渲染 `displayPrompts`（推荐方案生成 + 6 能力胶囊 + 换一批），`handlePromptClick` 直达路由。
- `focus-chips`（[ScreenChat.tsx](frontend/src/pages/mobile-workbench/ScreenChat.tsx) `floatingContent` 内联）：聚焦空输入，**复用同一份** `displayPrompts`，但 `handleChipClick` 只做 `if(payload) send else 填label`——对无 payload 的胶囊是死路。

`SuggestedPrompt.action` 为 6 值联合（navigate-brief / prefill-brand-template / prefill-market-analysis / send-text / virtual-image / virtual-video），`FOCUS_CHIP_ICONS` 按_action_取描边图标。

## Goals / Non-Goals

**Goals:**
- 聚焦 chips 改为独立示例消息集，与药丸内容解耦
- chips 只走 sendMessage 路径（4 条都带 payload），bug 自然消失
- 4 条覆盖 4 类意图，与药丸零 payload 重叠，含药丸未覆盖的 query_data
- 样式、图标风格、药丸行为零改动

**Non-Goals:**
- 不合并药丸与 chips 组件/CSS/图标
- 不改 handleChipClick 逻辑
- 不动药丸、+ 号面板、意图识别

## Decisions

### D1: bug 靠换数据源修复，不改 handler

`handleChipClick` 的 send-payload 分支本来就正确，问题在旧 chips 混入了无 payload 的胶囊（触发残缺的"填 label"分支）。新 `FOCUS_CHIP_EXAMPLES` 4 条都带 payload → 只走 send-payload → bug 消失，handler 一行不改。这是最小改动路径。

### D2: 4 条示例消息（已对照意图规则验证 + 去重药丸）

| # | payload（=label） | 意图 | 路由 | action（图标key） |
|---|---|---|---|---|
| 1 | 帮我调研一下智能手表 | market_research | 调研结果页 | prefill-market-analysis |
| 2 | 帮我生成一张运动产品海报 | text_to_image | 图片参数卡 | virtual-image |
| 3 | 帮我做一条产品宣传片 | text_to_video | 视频参数卡 | virtual-video |
| 4 | 上海有哪些运动赛事 | query_data | 平台赛事查询 | send-text |

- 4 意图各异、4 图标各异（复用现有描边集）。
- 与药丸 `displayPrompts` payload 零重叠；#4 query_data 药丸无此能力。
- 文案是开发者预置的**用户输入模板**，非 LLM 编造名称/数据，符合数据引用规则。

### D3: action 字段兼作图标 key

`SuggestedPrompt.action` 在 chips 渲染时只用于 `FOCUS_CHIP_ICONS[action]` 取图标（chips 点击只看 payload）。故 #1-#3 的 action 值（prefill-market-analysis / virtual-image / virtual-video）**仅作图标索引**，不代表真实动作——真实动作统一是"发送 payload"。`handleChipClick` 不读 action，无副作用。加注释说明。

### D4: 清理 floatingContent useMemo deps

`floatingContent` 当前 deps 含 `suggestedPrompts`（因旧 chips 映射 displayPrompts）。改用静态 `FOCUS_CHIP_EXAMPLES` 后，chips 分支不再依赖 suggestedPrompts；action-panel 分支也不依赖。deps 收敛为 `[showActionPanel, showFocusChips, handleChipClick]`。

## Risks

1. **#4 query_data 路由稳定性**："上海有哪些运动赛事" 需意图识别判为 query_data。规则 9 query_data 为兜底数据查询意图，"有哪些赛事" 是典型数据查询，预期稳定；若误判为 chat，最坏退化为普通回复，非崩溃。可接受。
2. **action 作图标 key 的语义混淆**：#1-#3 的 action 名（prefill-market-analysis 等）与实际"发送消息"动作不符，可能误导后续维护者。缓解：常量定义处加注释说明 action 仅作图标索引。
