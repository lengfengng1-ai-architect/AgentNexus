## Context

当前移动端工作台 P1 已实现 ① 对话入口屏 + 页壳 + 路由 + 样式隔离 + popstate。②-⑤ 屏为占位。设计稿 `system-kit.mobile-workbench2.html` 含完整 5 屏布局、样式（蓝色 `#1677ff` 调色板 + color-mix 派生）、交互脚本和 mock 数据（娃哈哈魅力系列案例）。前端位于 `frontend/src/pages/mobile-workbench/`，样式位于 `mobile-workbench.css`（`.mw` 作用域隔离）。

本变更为纯前端展示页：无后端接口、无 API 调用、无 LLM/Agent、无数据层。

## Goals / Non-Goals

**Goals:**
- ②-⑤ 屏完整移植设计稿 UI 到 React 组件
- 手机框尺寸从 360×740 调整为 360×780（iPhone 15 Pro 等比例，393:852）
- 移植设计稿全部交互：城市多选、Agent 流水线静态展示、行动筛选互斥、采纳切换、转发状态切换、跨屏 CTA
- 所有 mock 数据硬编码自设计稿（娃哈哈魅力系列案例）

**Non-Goals:**
- 不连接后端/API/LLM
- 不构建真实方案生成/下发引擎
- 不做移动端响应式适配
- 不接入 `backend/mock_data/` 体系

## Decisions

### D1：每屏独立组件文件
与 P1 一致：`ScreenBrief.tsx` / `ScreenGenerate.tsx` / `ScreenActions.tsx` / `ScreenDispatch.tsx`，每屏自持交互状态（城市选中用 `useState`、筛选用 `useState`、采纳用 `useState<boolean>`）。跨屏跳转通过 `onNavigate(screen)` 上抛到 `MobileWorkbenchPage` 切 Tab。

### D2：CSS 扩展而非新增文件
所有新屏样式直接在 `mobile-workbench.css` 的 `.mw` 作用域下新增选择器，复用已有 CSS 变量（`--accent/#1677ff` 蓝色系 + `color-mix` 派生色）。不新增 CSS 文件，不引入新色值。
- **备选**：每屏独立 CSS 文件。**否决**：选择器叠加 `.mw` 前缀已确保隔离，单文件减少网络请求。

### D3：PhoneFrame 尺寸变更
`.mw .phone{ width:360px; height:780px; }`。360 宽度保留 PC 展示习惯，780 高度按 iPhone 15 Pro 比例（393:852 = 360:780）。home-ind、notch、screen 等绝对定位子元素无需调整（均相对于 phone）。
- **备选**：保持 740 高度。**否决**：用户明确要求按 iPhone 15 Pro 比例。

### D4：交互行为映射

| 原设计稿脚本 | React 实现 |
|---|---|
| `.chips-multi .chip` click → toggle `.on` | `useState<string[]>` 城市数组，chip 的 `.on` 基于是否在数组中 |
| `gen-btn` click → 推进流水线 + 切换"重新生成" | 静态展示，不模拟进度（展示态） |
| `.filters .fchip` click → 互斥高亮 | `useState<string>` 当前筛选，`.fchip.on` 唯一 |
| `.acard .adopt` click → 采纳态切换 | `useState<Set<string>>` 已采纳 ID 集合，toggle |
| `.fwd` click → done/wait 切换 | `useState<Set<string>>` 已转发 ID 集合，toggle |
| CTA 跳转到其他屏 | `onNavigate(screen)` 调用，如 `onNavigate('actions')` |

### D5：无后端 / 无数据层
与 P1 一致。名称（娃哈哈、锐动篮球盟）与数值（≥1亿、12.4w）直接硬编码自设计稿。不声明 `docs/api/*.yaml`。满足 LLM 不编造约束。

## Risks / Trade-offs

- **固定手机框在窄视口溢出** → 页面允许滚动条；移动端响应式为 Non-goal（ponytail: 不做 `transform: scale` 自适应）
- **CSS 文件增长** → `mobile-workbench.css` 从 ~200 行增到 ~450 行。ponytail：如文件超 600 行可拆为 `mobile-workbench-{screens}.css` 多文件
- **ScreenBrief 表单纯展示无提交** → 如同 P1 的 "inputbar 纯展示"，"AI 生成方案"按钮仅以 `console.log` 反馈
- **⑤ 屏转发数据无真实后端** → mock 数据仅用于展示设计参考，不构建真实转发引擎（out_scope）
