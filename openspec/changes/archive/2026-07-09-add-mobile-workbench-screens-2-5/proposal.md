## Why

当前移动端工作台① 对话入口屏（P1）已实现，但② 简报 / ③ 方案生成 / ④ 行动建议 / ⑤ 下发转达成 四屏为「开发中」占位，无法展示移动端工作台的完整流程。需将设计稿中这四屏的 UI 和交互移植为 React 组件。

## What Changes

- PhoneFrame 尺寸：360×740 → 360×780（按 iPhone 15 Pro 393×852 等比例缩放，360≈393×360/393 保留 PC 展示习惯）
- ② 简报屏 `ScreenBrief.tsx`：方案头(渐变)·简报表单(品牌/产品线/目标人群/营销目标/周期/城市多选/核心策略)·吸底「AI 生成方案」按钮
- ③ 方案生成屏 `ScreenGenerate.tsx`：5 步 Agent 流水线(已完成/进行中/待开始状态切换)·策略定位 card·三级赛事体系 card·核心 KPI row·「下一步行动建议」CTA 跳转
- ④ 行动建议屏 `ScreenActions.tsx`：5 个筛选互斥标签·5 条行动 card(海报/赛事/视频/直播)·采纳切换 toggle·「采纳并下发」CTA 跳转
- ⑤ 下发转达屏 `ScreenDispatch.tsx`：下发 Hero(已下发方案/3 项统计)·5 条转发看板(转发状态点击切换)·「再下发一条」CTA
- CSS 扩展：在 `mobile-workbench.css` `.mw` 作用域下增加所有新屏所需样式
- `MobileWorkbenchPage.tsx` 路由更新：条件渲染新组件替换 Placeholder

## Capabilities

### New Capabilities
- `mobile-workbench-preview`: 移动端工作台展示页（已在 P1 建立主 spec，本变更加入 ②-⑤ 屏的 ADDED Requirements）

### Modified Capabilities

无。本变更仅向 `mobile-workbench-preview` 主 spec 新增 Requirement，不修改现有 capability 行为。

## Impact

- **前端文件**（修改）：
  - `frontend/src/pages/mobile-workbench/mobile-workbench.css` — 增加新屏样式（.wk-head/.form/.chips-multi/.pipe/.plancard/.kpi-row/.cta-line/.filters/.feed/.acard/.dp-hero/.fwd-list 等）
  - `frontend/src/pages/mobile-workbench/MobileWorkbenchPage.tsx` — 条件渲染替换 Placeholder，加入新组件 import
- **前端文件**（新增）：
  - `frontend/src/pages/mobile-workbench/ScreenBrief.tsx` — ② 简报屏
  - `frontend/src/pages/mobile-workbench/ScreenGenerate.tsx` — ③ 方案生成屏
  - `frontend/src/pages/mobile-workbench/ScreenActions.tsx` — ④ 行动建议屏
  - `frontend/src/pages/mobile-workbench/ScreenDispatch.tsx` — ⑤ 下发转达屏
- **后端 / API**: 无。纯前端展示页
- **依赖**: 无新增依赖

## Non-goals

- 不构建方案自动执行/生成引擎（out_scope `campaign-execution`）
- 不接入真实数据/LLM/API（所有名称和数值与 P1 一致，硬编码自设计稿）
- 不做移动端响应式适配
- 不做真实数据层（不接入 `backend/mock_data/` 体系）

## Mock 数据覆盖说明

所有名称（娃哈哈、锐动篮球盟、羽悦盟、城市跑团、泳动生活、街球俱乐部等）与数值（≥1亿、≥50万、≥500万、12.4w、86% 等）均与 P1 设计稿同一来源，硬编码在组件中。不经过 LLM、不经过 API、不落入 `backend/mock_data/` 体系。
