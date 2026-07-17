# 移动端调研结果页重设计 — Design Doc（探索草稿）

> 本文档是 brainstorming 产出的设计探索草稿，作为 `/opsx:explore` 的输入。
> 正式 OpenSpec 规范以 `openspec/changes/<change-name>/` 为准。
> 日期：2026-07-17 · 状态：设计已确认，待进入 OpenSpec 流程

## 背景与问题

移动端聊天输入"帮我调研下智能手表"触发 market_research 后：

- **进行中**：气泡内渲染 `MarketResearchProgressCard`（搜索状态条 + 进度日志滚动窗口）—— 用户反馈可接受，保留
- **完成后**：气泡直接 `dangerouslySetInnerHTML` 渲染完整 markdown 报告（`full_report` 通常 3000+ 字）—— 用户反馈"太丑"，聊天流被一大段长文撑爆

## 目标

1. 调研完成后，聊天气泡内只显示一个摘要卡片 + "查看调研结果"按钮
2. 点击按钮跳转到一个新"页面"展示完整调研结果（毛玻璃视觉风格）
3. 页面切换带从右往左覆盖的转场动画
4. 仅改移动端，PC 端聊天保持现状

## 非目标

- 不改后端（market-analysis SSE 接口、MarketResearchResult 数据契约均不变）
- 不改 PC 端聊天调研结果展示
- 不做结果页 URL 路由 / 分享 / 刷新恢复
- 不改调研进行中的过程展示

## 关键决策（用户已确认）

| 决策点 | 选择 |
|---|---|
| 调研过程展示 | 保留现状，完成后替换为摘要卡片（过程不回看） |
| 摘要卡片形态 | 关键数字摘要卡 + 按钮（TAM/CAGR/机会评估 badges） |
| 结果页内容结构 | 结构化卡片 + 完整 markdown 报告 + 证据来源 |
| 页面组织 | 单页长滚动 |
| PC 端 | 只改移动端 |
| 技术方案 | 手机框内覆盖屏（方案 A），复用 budget-preview/action-preview 模式 |

## 架构与数据流

```
SSE 流（现状保留）
  进行中：气泡内 MarketResearchProgressCard
        │ result 事件到达
        ▼
useChat: setMarketResearchResult(msgId, resultData)
        ▼
气泡完成态（改）：渲染 <ResearchReportEntryCard>
  📊 {market_name}调研报告 · 副标题（N 个板块）
  TAM/CAGR 大字号数字（缺则不渲染）
  机会评估 badges（缺则不渲染）
  [查看完整调研报告 ›] 毛玻璃按钮
        │ 点击
        ▼
ScreenChat → onNavigate('research-report', msgId)
        ▼
MobileWorkbenchPage
  screen = 'research-report'
  从 messages 找到 msgId 的 marketResearchResult
  渲染覆盖层（position:absolute inset:0, zIndex 40, rr-slide-in）
        ▼
<ScreenResearchReport result onBack />
  毛玻璃 sticky 顶栏（‹ 返回 · market_name · 板块构成副标题）
  长滚动内容：复用 MarketResearchResultCards 子卡片 + 毛玻璃皮肤
        │ 点‹返回
        ▼
rr-slide-out 滑出（300ms）→ unmount 覆盖层 → screen 回 'chat'
```

数据不离开 React 状态树：result 存在 ChatMessage 上，覆盖屏只是"换个方式看同一条消息"。无新接口、无 storage、无 URL 变化。

## 组件设计

### ResearchReportEntryCard（新，聊天内摘要卡片）

- 视觉：沿用媒体卡片重设计语言（白底、1px border、16px 圆角、轻投影，`.imc-card` 同款）；按钮为 accent 色毛玻璃质感
- 内容来源：`message.marketResearchResult`（Record<string, unknown>）
  - 标题：`{market_name || '市场'}调研报告`
  - 副标题：统计有数据的板块数（规模/趋势/用户/竞品/机会/报告），如"已完成 · 5 个板块"
  - 数字区：TAM（value+unit）与 CAGR，大字号；两者都缺则整块不渲染
  - badges：market_attractiveness / competition_intensity / entry_difficulty 三色徽章；缺则不渲染
  - 兜底：即使只有标题 + 按钮也成立
- 点击：`onOpen(message.id)` → 冒泡到 onNavigate

### ScreenResearchReport（新，覆盖屏）

- 顶栏：sticky，毛玻璃（`backdrop-filter: blur(20px)` + 半透明白底），‹ 返回按钮、标题（market_name）、副标题（如"3个趋势 · 2类用户 · 3家竞品"，从数据动态生成）
- 内容区：长滚动，背景用移动端聊天同款底色；板块卡片为半透明白 + backdrop-filter blur 形成毛玻璃层次
- 板块复用 `MarketResearchResultCards` 的子卡片（市场摘要/市场规模/趋势信号/目标用户/竞争格局/机会评估/完整报告/证据来源），不重写渲染逻辑；通过 `.mw` 作用域的新 CSS 类（如 `.mrr-card`）提供毛玻璃皮肤，PC 端 Tailwind 样式不受影响
- 板块缺数据自动不渲染（组件已有逻辑）；result 为空对象 → 渲染"报告数据不完整"占位 + 尝试显示 full_report

### 转场动画

复用 budget-preview 模式（`bp-slide-in`/`bp-slide-out` 同款参数）：

```css
.rr-slide-in  { animation: rrIn  .3s ease-out; }  /* translateX(100%) → 0 */
.rr-slide-out { animation: rrOut .3s ease-in;  }  /* 0 → translateX(100%) */
```

- 打开：`onNavigate('research-report', msgId)` → 覆盖层带 `rr-slide-in` 挂载
- 关闭：点‹ → `isRrAnimatingOut=true`（切 `rr-slide-out`）→ 300ms 后 unmount、screen 回 'chat'（与 `handleBudgetPreviewBack` 同款时序）

### MobileWorkbenchPage 接线

- `MobileScreen` 联合类型 + `'research-report'`
- `handleBack` 映射：`'research-report' → 'chat'`
- 状态：`researchReportMsgId: string | null`、`isRrAnimatingOut: boolean`
- 覆盖层渲染：与 budget-preview 同构（`position:absolute; inset:0; zIndex:40`）
- `HIDE_TABS` + `'research-report'`
- topbar：覆盖屏自带毛玻璃顶栏，hideTopbar 逻辑同 budget-preview
- msgId 找不到消息 → 不跳转，停留聊天屏（兜底）

### ChatBubble 改动

- 移动端（`variant === 'mobile'`）market_research 完成态分支：删除 `full_report` markdown 直渲，改为渲染 `<ResearchReportEntryCard>`，新增 `onOpenResearchReport?: (msgId: string) => void` prop
- 进行中分支（MarketResearchProgressCard）与回退分支（异常断开时的纯文本渲染）保持不变
- PC 端分支完全不动

## 错误处理

| 场景 | 行为 |
|---|---|
| result 部分字段缺失 | 对应板块/数字/badges 不渲染，其余正常 |
| result 为空 `{}` | 覆盖屏显示"报告数据不完整"占位，尝试渲染 full_report |
| 点击按钮但 msgId 找不到消息 | 不跳转，停留聊天屏 |
| 调研失败 | 沿用现状（气泡显示失败文案，不出摘要卡片） |

## 测试策略

前端（vitest + @testing-library）：

1. `ResearchReportEntryCard.test.tsx` — 完整数据渲染；缺 market_size 降级；缺 opportunity 降级；点击回调携带 msgId；market_name 空时兜底标题
2. `ScreenResearchReport.test.tsx` — 完整 result 各板块标题出现；空 result 不 crash 且显示降级占位；返回按钮回调
3. 页面级转场动画不写定时器测试（ponytail：靠浏览器人工验证，定时器测试脆弱）

后端：零改动，无新测试。

验证命令：`vitest run`（相关文件）+ `tsc --noEmit` + 浏览器人工走查完整链路。

## 改动文件清单

| 文件 | 类型 |
|---|---|
| `frontend/src/pages/mobile-workbench/ScreenChat.tsx` | 改：MobileScreen 联合类型 +'research-report' + 透传 onNavigate(msgId) |
| `frontend/src/components/ChatBubble.tsx` | 改：移动端完成态分支换 ResearchReportEntryCard |
| `frontend/src/components/ResearchReportEntryCard.tsx` | 新 |
| `frontend/src/pages/mobile-workbench/ScreenResearchReport.tsx` | 新 |
| `frontend/src/pages/mobile-workbench/MobileWorkbenchPage.tsx` | 改：接线 + 覆盖层 + handleBack + HIDE_TABS |
| `frontend/src/pages/mobile-workbench/mobile-workbench.css`（或新 css） | 改：rr-slide 动画 + `.mrr-*` 毛玻璃皮肤 |
| `frontend/src/components/MarketResearchResultCards.tsx` | 可能微调（接受额外 className/variant，不动 PC） |
| `frontend/src/__tests__/ResearchReportEntryCard.test.tsx` | 新 |
| `frontend/src/__tests__/ScreenResearchReport.test.tsx` | 新 |
