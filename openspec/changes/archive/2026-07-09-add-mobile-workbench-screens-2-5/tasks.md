# 实现任务 — add-mobile-workbench-screens-2-5

## 1. 手机框尺寸与 CSS 扩展

- [x] 1.1 `.mw .phone` 高度从 740 改为 780（iPhone 15 Pro 比例）
- [x] 1.2 在 `mobile-workbench.css` 新增②-⑤屏所需样式（.wk-head / .form / .chips-multi / .dock / .pipe / .plancard / .kpi-row / .cta-line / .filters / .feed / .acard / .dp-hero / .fwd-list）

## 2. ② 简报屏（ScreenBrief.tsx）

- [x] 2.1 创建 `ScreenBrief.tsx`：方案头(渐变) + 简报表单(品牌/产品线/目标人群/营销目标/投放周期/城市多选/核心策略预填) + 吸底 AI 生成按钮，城市 chips 用 useState 管理选中态

## 3. ③ 方案生成屏（ScreenGenerate.tsx）

- [x] 3.1 创建 `ScreenGenerate.tsx`：5 步 Agent 流水线(✓/◉/○ 状态) + 策略定位 card + 三级赛事体系 card + KPI row + CTA「下一步行动建议」onNavigate('actions')

## 4. ④ 行动建议屏（ScreenActions.tsx）

- [x] 4.1 创建 `ScreenActions.tsx`：5 个筛选标签(useState 互斥) + 5 条行动 card(useState Set<string> 采纳 toggle) + CTA「采纳并下发」

## 5. ⑤ 下发转达屏（ScreenDispatch.tsx）

- [x] 5.1 创建 `ScreenDispatch.tsx`：Hero + 3 项统计 + 5 条转发看板(useState Set<string> 状态 toggle) + CTA「再下发一条」

## 6. MobileWorkbenchPage 集成

- [x] 6.1 `MobileWorkbenchPage.tsx` 加入 import（ScreenBrief / ScreenGenerate / ScreenActions / ScreenDispatch），条件渲染替换 Placeholder

## 7. 验证

- [x] 7.1 dev server 验证各屏与设计稿一致，PhoneFrame 尺寸正确，②-⑤ 交互正常
