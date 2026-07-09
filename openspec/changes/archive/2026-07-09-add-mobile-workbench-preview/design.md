## Context

PC 端 `App.tsx` 用自定义路由：`Page` 联合类型 + `NAV` 数组 + `window.history.pushState`，按 `window.location.pathname` 初始化当前页，但**没有 `popstate` 监听**，浏览器后退/前进对所有路由都失效。前端页面位于 `frontend/src/pages/`，组件位于 `frontend/src/components/`，全局样式 `src/index.css` 通过 Tailwind 定义 PC 设计 token（`start`=#FF4D00 橙、`track`、`line`、`mist`）。

原始移动端设计稿 `/Users/hxq/Downloads/system-kit.mobile-workbench2.html` 是一个独立的 5 屏手机原型（蓝色 `#1677ff` 调色板 + `color-mix` CSS 变量 + 自带文档头 + 灰色背景 + 内联 `<script>` 交互）。需要把它的手机内容移植进 React，并与 PC 样式隔离。

本变更为纯前端展示页：**无后端接口、无 API 调用、无 LLM/Agent、无数据层**。不涉及 `docs/api/*.yaml`、不涉及 `docs/conventions/prompt-templates.md`、不涉及 `docs/conventions/agent-framework.md`。数据流为静态硬编码 mock（取自设计稿），不经过 `backend/mock_data/`。

## Goals / Non-Goals

**Goals:**
- header 新增「移动端」入口，跳转 `/mobile` 可达
- 移动端展示页：纯白背景 + 居中手机框 + ①-⑤ Tab 切换
- P1 完成 ① 对话入口屏（含聊天发送交互），②-⑤ 为「开发中」占位
- 样式与 PC 隔离：`.mw` 作用域自带 CSS 变量，不污染 `:root`、不引用 PC token
- 浏览器后退/前进对所有路由生效（补 `popstate`）
- 原始设计稿保留到 `frontend/public/` 作参考

**Non-Goals:**
- 不构建下发引擎（out_scope `campaign-execution`），⑤ 屏仅为 mock 展示
- 不接入真实数据 / 跨平台数据 / LLM
- 不做真实移动设备响应式适配（页面在 PC 浏览器查看固定尺寸手机框）
- P2-P5（②简报/③生成/④行动/⑤下发）的完整实现不在本变更范围，逐屏以后续变更补齐

## Decisions

### D1：路由 — 扩展现有自定义路由，不引入 react-router
`App.tsx` 已有 `Page` 联合 + `NAV` + `pushState` 模式。新增 `mobile` 到 `Page` 与 `NAV`，`navigate` 增加 `/mobile` 分支，初始化读取 `pathname === '/mobile'`。
- **备选**：引入 `react-router-dom`。**否决**：项目无路由库依赖，现有 5 个页面均用自定义路由，引入新库违反 ponytail（不被要求的依赖）且与现状不一致。
- **补 `popstate`**：新增 `useEffect` 注册 `popstate` 监听，回调里按 `window.location.pathname` 反查 `Page` 并 `setPage`。这是对所有路由的健壮性补全，不只服务 `/mobile`。

### D2：样式隔离 — `.mw` 作用域的全局 CSS 文件
新建 `src/pages/mobile-workbench/mobile-workbench.css`，把原设计的 CSS 变量（`--bg/--fg/--accent/#1677ff` 系列 + `color-mix` 派生色）挂在 `.mw` 选择器下（**不**挂 `:root`），所有选择器加 `.mw` 前缀。页面根容器 `<div className="mw">`。Tab 切换器、纯白衬底、手机框全部用这套变量。
- **备选 A**：CSS Modules（`*.module.css`）。**否决**：原设计 190+ 行选择器互相引用，改 module 需大量 className 改写，且 `color-mix` 变量共享不便。
- **备选 B**：复用 PC Tailwind token。**否决**：用户明确要求"与 PC 隔离、自成一套"，且移动端是蓝色调色板，与 PC 橙色 `start` 冲突。
- **备选 C**：iframe 嵌入原 HTML。**否决**：用户已选 React 移植方案。
- **字体**：复用 `index.css` 已全局加载的 Inter（移动端 `--ff` 首选即 Inter），不重复加载，无冲突。

### D3：组件结构 — PhoneFrame 共享壳 + 每屏一个大组件
```
MobileWorkbenchPage        // 页壳：纯白背景 + Tab 状态 + 屏切换 + 跨屏 CTA 回调
└─ PhoneFrame              // 共享：notch / statusbar / home-ind / 滚动容器，接受 topbar + children
    └─ activeScreen
       ├─ ScreenChat       // ① P1 实现
       ├─ ScreenBrief..Dispatch // ②-⑤ P2-P5，P1 用占位组件
```
- 每屏自持交互状态（① 的消息列表用 `useState`）。跨屏 CTA（①「去填写简报」→②）通过 `onNavigate(screen)` 回调上抛到页壳切 Tab。
- **备选**：把 5 屏合并进一个文件。**否决**：用户明确"每个页面都是一个大组件"，且单文件会超 800 行（违反 coding-style）。

### D4：交互移植 — 原 `<script>` 行为映射为 React 状态
| 原脚本行为 | React 实现 |
|---|---|
| 发送消息 → 追加 user 气泡 + 延迟 agent 回复 | `useState` 消息数组 + `setTimeout` 追加 |
| 「填写简报」卡片/快捷 → 跳 ② | `onNavigate('brief')` 切 Tab |
| ②-⑤ 占位 | P1 渲染「开发中」占位，P2-P5 替换 |

### D5：原始设计稿保留 — 复制到 `frontend/public/mobile-workbench-reference.html`
- **备选**：放 `docs/references/`。**否决**：`docs/references/` 现仅放 API 文档（`qwen-image-api.md`），且 `directory-structure.md` 的 `docs/` 树未列 `references/`；放 `frontend/public/` 贴合 Vite 静态资源约定，且可 web 访问（`/mobile-workbench-reference.html`）便于对照。
- 副本与原文件一致，仅作参考，不被应用引用（React 移植是独立实现）。

### D6：无接口 / 无数据层
纯静态展示。屏内名称（娃哈哈、锐动篮球盟）与数值（≥1亿、12.4w）硬编码自设计稿 mock。不声明 `docs/api/*.yaml`，不接入 `backend/mock_data/`，无数据流可标（或标为"静态硬编码 mock"）。

## Risks / Trade-offs

- **`color-mix` 浏览器支持** → 仅 evergreen 浏览器支持。本页为内部预览/参考，不做兼容兜底。如需兜底，后续可把派生色预计算成字面量。`ponytail:` 天花板=旧浏览器降级，升级路径=预计算色值。
- **固定 360×740 手机框在窄视口溢出** → 页面允许出现滚动条；移动端响应式为 Non-goal。`ponytail:` 不做 `transform: scale` 自适应。
- **作用域 CSS 泄漏** → 所有选择器强制 `.mw` 前缀；不使用裸标签选择器（除 `.mw` 内部的 `*{box-sizing}` 等需限定在 `.mw *`）。
- **`popstate` 与初始 `pushState` 双触发** → 监听仅 `setPage`，不再次 `pushState`，避免循环。
- **spec 范围 vs 增量实现** → 本变更 spec 只覆盖 P1（① + 页壳 + 导航 + 隔离 + popstate）；②-⑤ 完整行为由后续变更以 ADDED Requirements 补齐，避免 spec 与实现不符导致 archive 失败。
