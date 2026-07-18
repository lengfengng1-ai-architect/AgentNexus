## Context

移动端工作台（`MobileWorkbenchPage`）顶栏已有3个点菜单，但仅在 generate/preview 屏 + 方案完成时可见，且只提供导出功能。用户希望：①3个点颜色加深（纯黑）；②始终可见，新增"方案草稿"入口；③点击打开草稿列表覆盖层；④点列表项打开草稿详情覆盖层（展示方案生成页的"生成结果"内容）；⑤详情页支持下载。

关键发现：后端 `GET /plan/runs` 已返回 `brand_input`（含 brand_name/product_matrix/category）+ `created_at` + `status`，`POST /plan/summary` 已提供摘要数据，导出 API 已存在。**本变更无需任何后端改动**，纯前端实现。

## Goals / Non-Goals

**Goals:**
- 3个点始终可见，按状态动态显示菜单项（导出仅 completed 时，草稿始终）
- 3个点图标纯黑色
- 草稿列表覆盖层（单层，列表态 + 详情态两种视图）
- 草稿详情复用"生成结果"卡片样式 + 下载 + 跳转

**Non-Goals:**
- 草稿编辑/删除/命名
- PC 端草稿列表
- 后端新增存储或 API
- 草稿数量限制或 TTL

## Decisions

### D1: 复用现有 API，零后端改动

草稿 = `status === 'completed'` 的 plan run。列表用 `GET /plan/runs`，详情用 `POST /plan/summary`，下载用现有导出端点。前端 `listPlanRuns` 返回类型扩展接受 `brand_input` 字段。

**天花板**：`GET /plan/runs` 默认 limit=20，超过 20 条的历史草稿不会展示。升级路径：后端分页或前端增大 limit。

### D2: 单层覆盖层 + 内部视图切换（非两层堆叠）

草稿列表和详情共用同一个覆盖层容器（zIndex 40），通过内部 state（`'list' | 'detail'`）切换视图。视图切换时复用 slide-in-right/slide-out-right 动画。

**理由**：与 research-report 覆盖层模式一致，避免 z-index 嵌套的复杂性。详情返回直接切回列表视图，保留列表滚动位置。

### D3: 视图切换动画方案

- 列表 → 详情：列表视图淡出/滑出，详情视图 slide-in-right
- 详情 → 列表：详情视图 slide-out-right，列表视图 slide-in-right

实现：在 `ScreenDraftList` 内部维护 `view` state 和 `selectedDraftId` state，用 CSS class 控制两个子视图的 transform/opacity。

### D4: 详情页跳转（查看完整方案 / 下一步建议）

详情页按钮 → 关闭整个草稿覆盖层 → `planRun.restoreFromRunId(run_id)` → `setScreen('preview' | 'actions')`。

**注意**：`restoreFromRunId` 是异步的，需等待恢复完成后再切屏，否则 preview/actions 屏可能拿不到数据。复用 `ScreenGenerate` 现有的恢复逻辑（已处理 localStorage run_id 持久化）。

### D5: 详情页下载复用 MobileWorkbenchPage 的 handleExport

详情页顶栏3个点的下载逻辑与 MobileWorkbenchPage 完全一致（exportPlanPdf/Xlsx），但使用选中草稿的 `run_id` 而非 `localStorage` 中的当前 run_id。提取为共享函数或直接在 `ScreenDraftList` 内实现一份（ponytail：复制优于过早抽象）。

### D6: 详情页摘要卡片样式复用

`ScreenGenerate` 的"生成结果"区域（229-342 行）的 JSX 较复杂且耦合了 ScreenGenerate 的状态。**不抽取共享组件**（避免改动 ScreenGenerate 引入风险），而是在 `ScreenDraftList` 详情视图中用相同的 className（`.plancard` / `.ph` / `.pb` / `.kpi-row`）和 inline style 复刻相同样式。摘要数据来自 `getPlanSummary` 返回的 `PlanSummary` 结构（与 ScreenGenerate 完全一致）。

### D7: 草稿列表项相对时间

用简单的相对时间函数（刚刚/N分钟前/N小时前/昨天/N天前/日期）。ponytail：不引入 dayjs/date-fns，手写最小实现（参考 chat 场景已存在的模式）。

### D8: listPlanRuns 返回类型扩展

现有 `listPlanRuns` 返回 `{ run_id, status, created_at }[]`，但后端实际返回含 `brand_input`。扩展返回类型为 `{ run_id, status, created_at, brand_input?: { brand_name?, category?, product_matrix? } }`，向后兼容。

### D9: 草稿列表作为工作台 Tab（非3个点菜单项）

初版把"方案草稿"放在3个点菜单里。用户反馈：草稿应在外层屏幕切换 Tab 中。改为新增"⑥ 方案草稿"Tab，与对话/简报/生成/行动/下发同级。

- TABS 增加 `{ key: 'draft-list', label: '⑥ 方案草稿' }`
- 从 HIDE_TABS 移除 draft-list（Tab 栏保持可见）
- draft-list 作为 display-toggled 屏渲染（与其他 Tab 屏同构），不再是 zIndex 覆盖层
- 3个点菜单移除"方案草稿"项，恢复为仅 export-ready 时可点击（保留纯黑色）
- ScreenDraftList 自带顶栏（hideTopbar 保持 true for draft-list），列表视图无返回按钮（Tab 语境无需返回），详情视图保留返回（回列表）

### D10: 草稿详情直接读取 checkpoint outputs，不调 LLM 摘要

初版详情调 `POST /plan/summary`（`generate_plan_summary`），该接口每次都跑 LLM 重新归一化，无缓存。用户反馈："每次看方案结果都要重新 summary 吗？是不是可以直接查数据库结果"。

后端 checkpoint 已持久化结构化输出（`_checkpoint_state(run_id)` → `strategy_generation` / `budget_kpi` / `action_recommendations` / `execution_planning`），字段已足够结构化，无需 LLM 归一化。改为：

- 详情复用现有 `GET /plan/runs/{run_id}/status`（返回 outputs），前端直接映射
- 字段映射（无需 LLM）：
  - 策略定位 ← `strategy_generation.positioning` + `key_messages[]`
  - 核心 KPI ← `budget_kpi.kpis`（dict `{name: value}`）+ `allocations[]`（已含 category/percentage/amount）
  - 执行规划 ← `execution_planning.{leagues,events,influencer,content,store}_plan`（文本字段→标签行）
  - 行动建议 ← `action_recommendations.actions[]`（已含 title/description）
- 零后端改动，零 LLM 调用，即时加载，始终最新

**代价**：详情卡片用原始数据（非 LLM 归一化），与方案生成页"生成结果"（用 LLM summary）略有差异；但避免了每次重跑 LLM 的延迟与成本。方案生成页的 生成结果 保持原状（完成时生成一次，组件 state 持有）。

## Risks

1. **restoreFromRunId 异步竞态**：详情页跳转后切屏时数据可能未恢复完。缓解：用 await + 在 restore 完成的回调/effect 中切屏，或复用 ScreenGenerate 的恢复机制（设置 localStorage run_id 后由 ScreenGenerate 自己恢复）。
2. **listPlanRuns 类型扩展影响调用方**：现有调用方（ScreenGenerate）只用 `status`/`run_id`，扩展为可选字段不影响。已确认无破坏。
3. **视图切换动画抖动**：两个子视图同时挂载时需正确处理定位。缓解：绝对定位 + opacity/transform 切换，确保只有一个视图可见。
