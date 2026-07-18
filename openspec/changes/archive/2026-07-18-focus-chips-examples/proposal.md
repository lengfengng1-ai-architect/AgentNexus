## Why

移动端聊天聚焦态（输入框聚焦、空文本）的 `focus-chips` 与未聚焦态的 `sg-scroll` 药丸渲染**同一份** `displayPrompts`，内容重复；且 `focus-chips` 的点击 handler 对无 payload 的胶囊是死路（填 label 发送后意图路由到 chat/clarify，无实际动作）。需要把聚焦 chips 改为独立的"示例开场白"，与药丸内容解耦，同时让 chips 只走可靠的 sendMessage 路径。

## What Changes

- 新增独立常量 `FOCUS_CHIP_EXAMPLES`：4 条 send-text 示例消息（调研智能手表 / 生成运动产品海报 / 做产品宣传片 / 查询上海赛事），每条带 payload
- 聚焦 chips 的数据源从 `displayPrompts` 改为 `FOCUS_CHIP_EXAMPLES`
- 4 条覆盖 4 类意图（market_research / text_to_image / text_to_video / query_data），与药丸能力零 payload 重叠；query_data 是药丸未覆盖的能力
- 复用现有 `FOCUS_CHIP_ICONS` 描边图标集（4 条图标各异），样式零改动
- `handleChipClick` 不改（4 条都带 payload，天然走 sendMessage 分支，bug 自动消失）
- 药丸 `sg-scroll`、`ChatSuggestionHeader`、`displayPrompts`、换一批逻辑均不改

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `mobile-chat-session`: 聚焦态 chips 内容从复用药丸 `displayPrompts` 改为独立示例消息集，行为随之修正（点击直达意图路由而非填 label 死路）

## Impact

**前端**：仅 `frontend/src/pages/mobile-workbench/ScreenChat.tsx`（新增 1 常量 + 改 1 处 `.map` 数据源 + 清理 useMemo deps）

**后端**：无改动

**API**：无改动

**Non-goals**：
- 不合并药丸与 chips 的组件/CSS/图标（保留两套外观）
- 不改 chips 的 handler 逻辑（新内容只用 send-payload 分支）
- 不动 `+` 号面板、不动药丸
- 不改意图识别规则（chips 文案已能正确触发现有意图）
