## Why

当前方案工作台只有 PC 端形态，缺少移动端预览，无法直观展示"对话入口 → 简报 → 方案生成 → 行动建议 → 下发转发达成"的完整移动端流程。需要一个独立的移动端展示页，作为设计参考与移动端形态的可视化预览，便于后续移动端落地时对照。

## What Changes

- 在 PC 端 `App.tsx` header 导航新增「移动端」入口，点击跳转到 `/mobile` 路由
- 新增移动端展示页 `MobileWorkbenchPage`：纯白背景居中显示一个手机界面框架（模拟手机外观），通过 ①-⑤ Tab 切换 5 屏（对话入口 / 简报 / 方案生成 / 行动建议 / 下发转发达成）
- React 移植原始设计稿（非 iframe），每屏拆为一个独立大组件
- 样式与 PC 端隔离、自成一套：保留移动端原设计的蓝色调色板与 `color-mix` CSS 变量，挂在 `.mw` 作用域下，不使用 PC 的 `start`/`track`/`line`/`mist` token
- 原始设计稿保留到 `frontend/public/mobile-workbench-reference.html` 作为后续参考
- 顺带给 `App.tsx` 路由补充 `popstate` 监听，使浏览器后退/前进对所有路由生效

## Capabilities

### New Capabilities

- `mobile-workbench-preview`: 移动端工作台展示页。提供 `/mobile` 页面，居中手机框 + Tab 切换 5 屏的纯展示预览，样式与 PC 隔离。锚定 `superpowers.yaml` in_scope `plan-generation`（工作台主体），次要引用 `brand-input`（① 对话入口）。

### Modified Capabilities

无。导航入口新增属于本新能力的页面可达性要求，不改变既有 capability 的 spec 级行为。

## Impact

- **前端文件**:
  - `frontend/src/App.tsx` — NAV 数组新增「移动端」项、`Page` 联合类型新增 `mobile`、`navigate` 新增 `/mobile` 分支、新增 `popstate` 监听
  - `frontend/src/pages/mobile-workbench/MobileWorkbenchPage.tsx` — 新增，页壳（纯白背景 + Tab 切换 + 屏状态）
  - `frontend/src/pages/mobile-workbench/PhoneFrame.tsx` — 新增，共享手机外壳
  - `frontend/src/pages/mobile-workbench/ScreenChat.tsx` — 新增，① 对话入口
  - `frontend/src/pages/mobile-workbench/mobile-workbench.css` — 新增，隔离的移动端样式系统（`.mw` 作用域）
  - `frontend/src/__tests__/MobileWorkbenchPage.test.tsx` — 新增，P1 smoke test
  - `frontend/public/mobile-workbench-reference.html` — 新增，原始设计稿副本（参考用）
  - P2-P5 屏组件（`ScreenBrief` / `ScreenGenerate` / `ScreenActions` / `ScreenDispatch`）后续阶段补齐
- **后端 / API**: 无。纯前端展示页，无端点、无数据请求
- **依赖**: 无新增依赖（复用已安装的 React 19 / Vite / Tailwind / vitest / testing-library）

## Non-goals

- **不构建方案自动执行引擎**（out_scope `campaign-execution`）：第 ⑤ 屏「下发与转发达成」仅为 mock UI 展示，不创建真实活动、不发送达人邀约、不调用任何下发接口
- **不接入跨平台数据**（out_scope `external-platform-data`）：屏内所有名称（娃哈哈、锐动篮球盟等）与数值（≥1亿、12.4w 等）均为设计稿硬编码 mock，无真实数据源
- **不引入 LLM / Agent**：纯静态展示移植，无 prompt、无模型调用、无数据编造风险
- **不做真实数据层**：不接入 mock_data 体系，不预留 API 切换钩子（本页是设计参考，非产品功能页）
- **不做移动端响应式适配**：页面本身在 PC 浏览器查看，展示一个固定尺寸手机框；不对真实移动设备做适配
- P2-P5 四个屏组件不在本次 P1 范围内，逐屏补齐

## Mock 数据覆盖说明

本页为纯设计稿移植，无运行时数据获取。屏内展示的名称与数值直接硬编码自原始设计稿 `system-kit.mobile-workbench2.html`（娃哈哈魅力系列集群营销方案案例），属静态展示内容，不经过 LLM、不经过 API、不落入 `backend/mock_data/` 体系。满足"LLM 不可编造厂商/赛事/达人名称与数据数值"约束——因本页无 LLM 参与。
