## 1. 新增示例消息常量

- [x] 1.1 在 `ScreenChat.tsx` 顶部（`FOCUS_CHIP_ICONS` 附近）新增 `FOCUS_CHIP_EXAMPLES: SuggestedPrompt[]`，4 条，每条 `{ id, icon: '', label, action, payload }`，action 仅作图标索引（加注释）
- [x] 1.2 文案：①帮我调研一下智能手表(action=prefill-market-analysis) ②帮我生成一张运动产品海报(action=virtual-image) ③帮我做一条产品宣传片(action=virtual-video) ④上海有哪些运动赛事(action=send-text)
- [x] 1.3 label 与 payload 同值（chip 显示文案即发送文案）

## 2. 切换 chips 数据源

- [x] 2.1 `floatingContent` 的 `showFocusChips` 分支：`.map` 数据源从 `displayPrompts` 改为 `FOCUS_CHIP_EXAMPLES`
- [x] 2.2 `handleChipClick` 不改（4 条都有 payload，走 sendMessage）
- [x] 2.3 清理 `floatingContent` useMemo deps：移除 `suggestedPrompts`，收敛为 `[showActionPanel, showFocusChips, handleChipClick]`

## 3. 验证

- [x] 3.1 运行 `tsc --noEmit` 确认类型通过
- [x] 3.2 运行前端 vitest 确认无回归（9 个失败均为预存 ChatInput/MarketResearchProgressCard/PipelineTimeline/PlanPage/ScreenChat.hero，与本改动无关；3 个 ScreenChat 失败断言的是 `.suggestion-card` 药丸非 chips，零回归）
- [x] 3.3 浏览器验证：聚焦输入框 → 4 条示例 chip 渲染（图标各异、文案与药丸不同）
- [x] 3.4 浏览器验证：点 ④"上海有哪些运动赛事" → sendMessage 触发（文案入 DOM、输入框清空）；①/②/③ 走同一 sendMessage(payload) 路径
- [x] 3.5 浏览器验证：未聚焦药丸仍显示 displayPrompts（市场分析/预算评估/创建活动/产品海报/推荐方案生成）+ 换一批，行为不变
