## Context

`_normalize_intent_output()` 当 5 字段齐全且 intent 不是 video/image/market 时，将其修正为 `generate_plan`，当前 reply 保留 LLM 的自由输出（通常是"正在为您生成营销方案..."）。

ChatBubble 渲染时，`canGeneratePlan && onGeneratePlan` 会在气泡下方显示「生成方案」按钮。回复内容与按钮语义冲突：回复说"正在生成"，按钮却说"请点击生成"。

## Goals / Non-Goals

**Goals:**
- `generate_plan` 时 reply 用结构化摘要（品牌/品类/城市/预算/周期）替代 LLM 自由文案
- 摘要与按钮整合：用户一瞥确认信息无误，按钮是下一步动作

**Non-Goals:**
- 不修改 ChatBubble 渲染逻辑
- 不修改按钮行为（点击仍跳转简报）
- 不改变 normalize 的 intent 判定逻辑

## Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| 摘要生成位置 | `_normalize_intent_output()` 内 | 唯一汇总点，sync/stream 两路径共享 |
| 摘要格式 | `品牌：{name} · 品类：{category} · 城市：{city} · {budget}万 · {period}个月` | 横排紧凑，一瞥可读 |
| 摘要优先级 | 后处理覆盖 LLM reply | LLM 的回归不符合实际流程 |

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 摘要可能包含 None 字段 | 按规则 5 字段齐全才能进入 generate_plan，不会出现 None。加个 assert 兜底 |
| 移动端显示宽度受限 | 移动端 CSS 已有 max-width: 84% 限制，短文本更友好 |
