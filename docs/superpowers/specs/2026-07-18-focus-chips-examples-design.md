# 移动端聚焦 chips 内容改造（方向 2）— Brainstorming Design Doc

> 状态：草稿（待 /opsx:explore 确认）
> 日期：2026-07-18
> 约束：样式不变、图标风格不变、可修 bug、可调内容

## 1. 问题回顾

- `sg-scroll` 药丸（空态未聚焦）与 `focus-chips`（聚焦空输入）渲染**同一份** `displayPrompts`，内容重复。
- `focus-chips` 的 `handleChipClick` 只做 `if(payload) send else 填label`，对 4/6 个无 payload 胶囊是死路（填 label 发送后意图路由到 chat/clarify，无实际动作）。

## 2. 方向 2 设计

| 表面 | 角色 | 内容 | handler |
|------|------|------|---------|
| `sg-scroll` 药丸 | 能力发现（未聚焦欢迎页） | **保持不变**：推荐方案生成 + 6 能力胶囊 + 换一批 | `handlePromptClick`（直达路由） |
| `focus-chips` | 示例开场白（聚焦态） | **改为** 4 条 send-text 示例消息，每条带 payload | `handleChipClick`（sendMessage→意图路由） |

核心：chips 改用**独立数据源** `FOCUS_CHIP_EXAMPLES`，与药丸的 `displayPrompts` 解耦。由于 4 条都带 payload，`handleChipClick` 的 `sendMessage(payload)` 分支天然生效，**bug 自动消失，无需改 handler**。

## 3. 4 条示例消息（已对照意图规则验证）

意图识别规则关键点：market_research 需"调研/分析"关键词 + market_name + category；text_to_image 需"海报/图片"；text_to_video 需"视频/宣传片"；plan 缺字段 → clarify 引导。

| # | 文案（label & payload） | 触发意图 | 路由结果 | 复用图标（action） |
|---|-------------------------|----------|----------|---------------------|
| 1 | 帮我调研一下智能手表 | market_research | market_name=智能手表, category=消费电子 → 调研结果页 | `prefill-market-analysis`（柱状图） |
| 2 | 帮我生成一张运动产品海报 | text_to_image | "海报"关键词 → 图片参数卡 | `virtual-image`（图片） |
| 3 | 帮我做一条产品宣传片 | text_to_video | "宣传片"关键词 → 视频参数卡 | `virtual-video`（胶片） |
| 4 | 上海有哪些运动赛事 | query_data | 平台赛事数据查询（药丸无此能力，真正互补） | `send-text`（地球） |

4 条覆盖 4 类意图（调研/海报/视频/查询），路由均有效（非死路），图标 4 个各异（复用现有 FOCUS_CHIP_ICONS 描边集，风格不变）。

**去重校验**：与药丸 `displayPrompts` 零 payload 重叠；第 4 条 query_data 是药丸未覆盖的能力，真正互补；第 2/3 条虽同属图片/视频能力，但文案是"带帮我/修饰的具体示例句"，区别于药丸的能力标签，入口也不同（chips 发消息走意图 vs 药丸直达）。文案均为开发者预置的用户输入模板（非 LLM 编造名称/数据），符合数据引用规则。

## 4. 实现要点

- 新增常量 `FOCUS_CHIP_EXAMPLES: SuggestedPrompt[]`（4 条，每条 `{ id, label, action: 图标key, payload: 文案 }`），放在 ScreenChat.tsx 顶部。
- `floatingContent` 中 focus-chips 的 `.map` 数据源从 `displayPrompts` 改为 `FOCUS_CHIP_EXAMPLES`。
- `handleChipClick` **不改**（4 条都有 payload，走 sendMessage）。
- `ChatSuggestionHeader`（药丸）**不改**。
- `displayPrompts`、`PINNED_PROMPT`、`REFRESHABLE_POOL`、`shuffle` 均**不改**（药丸继续用）。

## 5. 影响范围

仅 `ScreenChat.tsx`：新增 1 个常量 + 改 1 处 `.map` 数据源。无 CSS、无图标、无后端、无 handler 改动。

## 6. 验证

- 4 条 chip 点击后均 sendMessage → 意图分别路由到 调研/海报/视频/字段引导。
- 药丸（未聚焦）仍显示原能力胶囊 + 换一批，行为不变。
- 聚焦态 chips 与未聚焦药丸内容不再重叠。

## 7. Non-goals

- 不合并药丸与 chips 组件/CSS/图标（用户要求保留两套外观）。
- 不改 chips 的"填 label" handler 逻辑（新内容只用 send-payload 分支，else 分支保留不删）。
- 不动 `+` 号面板。
