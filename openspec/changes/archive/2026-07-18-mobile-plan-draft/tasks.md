## 1. 前端类型与 API 扩展

- [x] 1.1 扩展 `frontend/src/api/plan.ts` 中 `listPlanRuns` 返回类型，新增可选 `brand_input?: { brand_name?: string; category?: string; product_matrix?: string }` 字段（向后兼容，不改后端）
- [x] 1.2 在 `frontend/src/pages/mobile-workbench/ScreenChat.tsx` 的 `MobileScreen` 类型新增 `'draft-list'` screen

## 2. 3个点菜单重构

- [x] 2.1 修改 `mobile-workbench.css`：`.mw .topbar .ico` 的 `color` 从 `var(--muted)` 改为 `var(--fg)`（纯黑色）
- [x] 2.2 重构 `MobileWorkbenchPage.tsx` 顶栏3个点：始终可点击（移除 `isExportReady` 对可点击性的门控），菜单项按状态动态显示
- [x] 2.3 菜单项顺序：当 `isExportReady` 时显示"导出 PDF"+"导出 XLSX"，最后始终显示"方案草稿"；非 export-ready 时仅显示"方案草稿"
- [x] 2.4 点击"方案草稿"打开草稿列表覆盖层（设置 draftList 状态）

## 3. 草稿列表/详情覆盖层组件

- [x] 3.1 新增 `frontend/src/pages/mobile-workbench/ScreenDraftList.tsx`，接收 `onBack`、`onRestorePlan(runId, targetScreen)` props
- [x] 3.2 内部 state：`view: 'list' | 'detail'`、`selectedDraft`、`summary`/`summaryLoading`、列表加载态 `drafts`/`loading`
- [x] 3.3 列表视图：`useEffect` 调用 `listPlanRuns(20)`，过滤 `status === 'completed'`，渲染草稿卡片（品牌名 · 产品线 · 相对时间）
- [x] 3.4 列表空态："暂无已完成的方案草稿" + 提示文案
- [x] 3.5 列表加载态：骨架屏或 spinner
- [x] 3.6 实现相对时间函数（刚刚/N分钟前/N小时前/昨天/N天前/日期），ponytail 手写最小实现
- [x] 3.7 详情视图：`useEffect` 调用 `getPlanSummary(selectedDraft.run_id)`，渲染策略定位/执行规划/核心 KPI/行动建议卡片（className 与 ScreenGenerate 一致）
- [x] 3.8 详情视图顶栏：显示品牌名 · 产品线 + 3个点菜单（导出 PDF/XLSX，使用 selectedDraft.run_id）
- [x] 3.9 详情视图底部："查看完整方案"按钮 → 调用 `onRestorePlan(run_id, 'preview')`；"下一步行动建议"按钮 → 调用 `onRestorePlan(run_id, 'actions')`
- [x] 3.10 视图切换动画：列表↔详情 slide-in-right/slide-out-right，CSS class 控制子视图 transform/opacity

## 4. 覆盖层接入 MobileWorkbenchPage

- [x] 4.1 在 `MobileWorkbenchPage` 新增 draft overlay 状态：`showingDraftList`、`isDraftAnimatingOut`
- [x] 4.2 新增 `handleOpenDraftList`（打开）和 `handleDraftBack`（关闭，触发 slide-out 300ms 后卸载）
- [x] 4.3 新增 `handleDraftRestorePlan(runId, targetScreen)`：关闭草稿覆盖层 → 设置 localStorage run_id → 切到 generate 屏触发恢复 → 再切到 targetScreen
- [x] 4.4 在 PhoneFrame 内渲染草稿覆盖层（`position:absolute; inset:0; zIndex:40`，slide-in/slide-out class）
- [x] 4.5 `hideTopbar` 增加 draft-list 屏；`HIDE_TABS` 增加 draft-list；`handleBack` 的 prev 映射增加 draft-list
- [x] 4.6 `DEFAULT_TOPBAR` 增加 `draft-list` 条目（兜底，覆盖层用自己的顶栏）

## 5. CSS 动画与样式

- [x] 5.1 在 `mobile-workbench.css` 新增 `.mw .draft-slide-in` / `.draft-slide-out`（复用 slide-in-right/slide-out-right 关键帧，含 reduced-motion 处理）
- [x] 5.2 新增草稿列表项样式（复用 `.plancard` 语言：白底、border、圆角）
- [x] 5.3 新增草稿详情视图样式（毛玻璃顶栏 backdrop-filter blur，复用 mrr-topbar 风格）

## 6. 测试

- [x] 6.1 新增 `frontend/src/__tests__/ScreenDraftList.test.tsx`：mock listPlanRuns/getPlanSummary，测试列表渲染、空态、详情渲染、下载触发、视图切换
- [x] 6.2 测试相对时间函数各分支（分钟/小时/天/日期）
- [x] 6.3 测试 3个点菜单动态项：completed 时含 3 项，未完成时仅草稿 1 项
- [x] 6.4 测试草稿详情跳转：点击查看完整方案调用 onRestorePlan(runId, 'preview')
- [x] 6.5 运行前端 vitest，确认新增测试通过且无回归
- [x] 6.6 运行 `tsc --noEmit` 确认类型检查通过

## 7. 浏览器验证

- [x] 7.1 启动前端 dev server，在移动端预览验证：3个点纯黑、始终可点击
- [x] 7.2 验证 chat 屏点3个点仅显示"方案草稿"，generate completed 屏显示 3 项
- [x] 7.3 验证草稿列表覆盖层 slide-in 动画、列表渲染、空态
- [x] 7.4 验证点击草稿切到详情视图、摘要卡片渲染
- [x] 7.5 验证详情页下载 PDF/XLSX 触发下载
- [x] 7.6 验证"查看完整方案"关闭覆盖层并跳转 preview 且数据正确
- [x] 7.7 验证详情→列表→关闭的动画连贯性

## 8. 用户反馈调整：草稿改为 Tab + 详情直读 DB

- [x] 8.1 草稿列表从3个点菜单移到工作台 Tab（⑥ 方案草稿），与对话/简报/生成/行动/下发同级
- [x] 8.2 draft-list 作为 display-toggled 屏渲染（非 overlay），Tab 栏保持可见
- [x] 8.3 3个点菜单移除"方案草稿"项，恢复 export-ready 时才可点击（保留纯黑色）
- [x] 8.4 移除 draft overlay 机制（isDraftAnimatingOut / handleDraftBack / handleOpenDraftList / showingDraftList / 覆盖层 JSX）
- [x] 8.5 草稿详情改用 `getPlanRunStatus`（GET /plan/runs/{id}/status）直读 checkpoint outputs，不再调 `getPlanSummary`（LLM 摘要），避免每次查看重新生成
- [x] 8.6 直读 outputs 映射卡片：strategy_generation.positioning/key_messages、budget_kpi.kpis(dict)/allocations、execution_planning 各字段、action_recommendations.actions
- [x] 8.7 列表顶栏移除返回按钮（Tab 语境），加 spacer 居中标题
- [x] 8.8 同步更新 spec（MODIFIED 菜单/详情 + ADDED Tab 需求）、design（D9/D10）、proposal
- [x] 8.9 更新 ScreenDraftList.test（mock getPlanRunStatus、移除列表 onBack 测试），15 测试通过，tsc 干净
- [x] 8.10 浏览器验证：Tab 入口、详情直读 DB 即时渲染、3个点恢复 inert、查看完整方案跳 preview
