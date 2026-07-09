# 移动端工作台②-⑤屏完整实现

## 需求

基于设计稿 `system-kit.mobile-workbench2.html`，将当前移动端工作台展示页的② 简报 / ③ 方案生成 / ④ 行动建议 / ⑤ 下发转达 四屏从「开发中」占位替换为完整 React 实现，移植原设计稿的全部交互行为与静态 mock 数据。

## 设计

### 手机框尺寸调整

当前 PhoneFrame 固定 360×740 → 调整为 360×780，保留 iPhone 15 Pro 比例（393:852 ≈ 1:2.17），360×780 等比缩放到 PC 展示适合宽度。

CSS 变更：`.mw .phone{ width:360px; height:780px; }`

### 组件拆分

每屏独立文件，通过 `MobileWorkbenchPage.tsx` 条件渲染替换 `Placeholder`：

| 屏 | 组件文件 | 内容 |
|---|---|---|
| ② 简报 | `ScreenBrief.tsx` | 方案头(渐变)·简报表单(品牌/产品线/目标人群/营销目标/周期/城市/策略)·吸底生成按钮 |
| ③ 方案生成 | `ScreenGenerate.tsx` | 5 步 Agent 流水线(含完成/进行中/待开始状态)·策略定位 card·赛事体系 card·KPI row·CTA 按钮 |
| ④ 行动建议 | `ScreenActions.tsx` | 5 个筛选互斥 Tag·5 条行动 card(采纳切换)·CTA 下发按钮 |
| ⑤ 下发转达成 | `ScreenDispatch.tsx` | 下发 Hero+3 项统计·5 条转发看板(已转发/未转发切换)·CTA 再下发按钮 |

### CSS 扩展

在 `mobile-workbench.css` 的 `.mw` 作用域下新增样式选择器：

| 选择器 | 用途 |
|---|---|
| `.mw .wk-head` | 方案渐变头部 |
| `.mw .sec / h3 / .more` | 区域标题 |
| `.mw .form / .field` | 表单字段 |
| `.mw .chips-multi / .chip` | 城市多选 |
| `.mw .dock / .gen` | 吸底生成栏 |
| `.mw .pipe / .step / .dot / .body` | Agent 流水线 |
| `.mw .plancard / .ph / .pb` | 方案结果卡 |
| `.mw .kpi-row / .k / .n / .l` | KPI 指标行 |
| `.mw .cta-line` | 跨屏 CTA 按钮 |
| `.mw .filters / .fchip` | 行动筛选 |
| `.mw .feed / .acard / .adopt` | 行动建议 card |
| `.mw .acard.adopted` | 已采纳态 |
| `.mw .dp-hero / .dp-stats` | 下发 Hero |
| `.mw .fwd-list / .frow / .fwd` | 转发看板 |
| `.mw .model` | 方案标签 |

样式变量复用车 `.mw` 已有的 `--accent/#1677ff` 蓝色系 + `color-mix` 派生色，不引入新色值（与设计稿一致）。

### 交互行为

| 屏 | 交互 | 实现方式 |
|---|---|---|
| ② 简报 | 城市 chips 点击互斥 | `useState` 选中城市数组，toggle 增减 |
| ② 简报 | 生成按钮反馈 | 控制台 log（纯参考展示） |
| ③ 方案生成 | 流水线固定状态 | 静态展示（不模拟进度推进） |
| ③ 方案生成 | CTA「查看」按钮 | 调用 `onNavigate('actions')` |
| ④ 行动建议 | 筛选互斥 | 点击高亮唯一选中 |
| ④ 行动建议 | 采纳切换 | 单 card 采纳态 toggle |
| ④ 行动建议 | CTA「下发」按钮 | 调用 `onNavigate('dispatch')` |
| ⑤ 下发转达成 | 转发状态切换 | 点击 pill toggle done/wait |
| ⑤ 下发转达成 | CTA「发布」按钮 | 控制台 log |

### Mock 数据策略

所有厂商/赛事/达人名称（娃哈哈、锐动篮球盟、羽悦盟、城市跑团等）与数据数值（≥1亿、12.4w、86%等）**硬编码自设计稿**，不经过 API、不经过 LLM、不落入 `backend/mock_data/`。满足"LLM 不可编造名称与数据数值"约束。

### 跳转关系

② 简报→③ 方案生成：用户不操作（展示态）。③→④ CTA「查看」。④→⑤ CTA「下发」。

不实现真实数据流或后端通信。

## 非目标

- 不构建真实下发引擎（out_scope `campaign-execution`）
- 不做真实移动端响应式适配
- 不接入真实数据/LLM
- 不修改 PC 端样式、路由或 API

## 测试

- 每个新组件：回归渲染测试（主 spec `mobile-workbench-preview` 已有 P1 smoke test，P2-P5 在架构上无新增后端依赖）
- 手动验收：dev server 切换 Tab 确认各屏与设计稿一致
