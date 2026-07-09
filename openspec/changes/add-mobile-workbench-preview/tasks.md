# 实现任务 — add-mobile-workbench-preview (P1)

> 本变更范围 = P1：导航入口 + `/mobile` 路由 + 页壳 + PhoneFrame + ① 对话入口 + 样式隔离 + popstate + 保留设计稿 + smoke test。
> ②-⑤ 完整实现为后续独立变更，不在本变更任务内（见末尾路线）。

## 1. 路由与导航入口（`frontend/src/App.tsx`）

- [ ] 1.1 `Page` 联合类型新增 `mobile`；`NAV` 数组新增「移动端」项；`navigate` 增加 `/mobile` 分支；初始化 `useState` 读取 `pathname === '/mobile'`。验收：点击 header「移动端」→ 地址栏变 `/mobile` → 渲染移动端页 → 入口激活态；直接访问 `/mobile` 也渲染移动端页。
- [ ] 1.2 新增 `useEffect` 注册 `popstate` 监听，回调按 `window.location.pathname` 反查 `Page` 并 `setPage`（不再次 `pushState`，避免循环）。验收：`/mobile` 后退到其他页、其他页前进到 `/mobile` 均正确切换且 header 激活态同步。

## 2. 隔离样式文件（`frontend/src/pages/mobile-workbench/mobile-workbench.css`）

- [ ] 2.1 新建样式文件，把原设计 CSS 变量（`--bg/--fg/--accent/#1677ff` 系 + `color-mix` 派生色）挂在 `.mw` 选择器下（不挂 `:root`），所有选择器加 `.mw` 前缀，包含手机框、状态栏、Tab 切换器、聊天气泡、输入栏等 P1 所需样式。验收：页面用 `.mw` 作用域变量；全局 `:root` 无新增变量；PC 其他页面样式不受影响。

## 3. 手机框与页壳（`frontend/src/pages/mobile-workbench/`）

- [ ] 3.1 `PhoneFrame.tsx`：渲染手机外壳（刘海 / 状态栏 / Home 指示条 / 可滚动内容区），接受 `topbar` 与 `children`。验收：手机框居中、含刘海与 Home 条、内容区可纵向滚动。
- [ ] 3.2 `MobileWorkbenchPage.tsx`：纯白背景容器 + Tab 切换器（5 屏标签）+ 当前屏状态 + `onNavigate(screen)` 回调；① 默认激活；②-⑤ 渲染「开发中」占位。验收：纯白背景、5 个 Tab、① 默认激活渲染 ScreenChat、点 ②-⑤ 显示占位。

## 4. ① 对话入口屏（`frontend/src/pages/mobile-workbench/ScreenChat.tsx`）

- [ ] 4.1 `ScreenChat.tsx`：对话气泡列表（初始含设计稿的 agent/user 气泡）+ 吸底输入栏（快捷「填写简报」+ 输入框 + 发送按钮）。验收：渲染设计稿 ① 屏的气泡与输入栏。
- [ ] 4.2 发送交互：输入框非空时点击发送或 Enter → 追加 user 气泡 + 清空输入 + 短延迟追加 agent 回复气泡 + 自动滚到底；空消息不发送。验收：发消息后出现 user+agent 气泡、输入清空、滚动到底；空消息无反应。
- [ ] 4.3 跳转简报：点击「填写简报」卡片或快捷按钮 → 调 `onNavigate('brief')`。验收：点击后 Tab 切到 ②（占位）。

## 5. 保留原始设计稿（`frontend/public/`）

- [ ] 5.1 复制 `/Users/hxq/Downloads/system-kit.mobile-workbench2.html` 到 `frontend/public/mobile-workbench-reference.html`（内容一致，仅作参考，不被应用引用）。验收：文件存在于 `frontend/public/`，可经 `/mobile-workbench-reference.html` 访问。

## 6. 测试（`frontend/src/__tests__/MobileWorkbenchPage.test.tsx`）

- [ ] 6.1 smoke test：渲染 `MobileWorkbenchPage` → 断言手机框/Tab/① 屏可见 → 模拟发送消息断言 user+agent 气泡出现 → 模拟点「填写简报」断言切到 ② 占位。验收：`pnpm test`（vitest）通过。

## 7. 端到端验收

- [ ] 7.1 启动 dev server 验证：header「移动端」入口 → `/mobile` → 纯白背景居中手机框 → ① 聊天可发消息并收到回复 → 点「填写简报」切到 ② 占位 → 浏览器后退回到上一页。验收：以上流程全部正常，无控制台报错。

---

## 后续变更路线（不在本变更范围）

以下为后续独立变更，每个新增 ADDED Requirements 到 `mobile-workbench-preview` capability，逐屏替换占位：

- `add-mobile-workbench-screen-brief` — ② 简报表单（城市多选 + 生成方案 CTA）
- `add-mobile-workbench-screen-generate` — ③ 方案生成（Agent 流水线 + 结果卡 + KPI + 下一步 CTA）
- `add-mobile-workbench-screen-actions` — ④ 行动建议（筛选互斥 + 采纳切换 + 下发 CTA）
- `add-mobile-workbench-screen-dispatch` — ⑤ 下发转发达成（mock 转发看板 + 转发状态切换；仅展示，不构建真实下发引擎）
