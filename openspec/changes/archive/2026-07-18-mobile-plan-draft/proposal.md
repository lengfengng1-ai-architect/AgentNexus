## Why

移动端方案生成完成后，"生成结果"区域嵌在流水线页面中，用户返回后需重新进入生成流程才能查看。用户需要一个独立的草稿入口，随时浏览历史方案摘要，并支持从草稿详情直接查看完整方案、下载文档。同时顶栏3个点图标颜色过浅（灰色 #6b7280），辨识度差。

## What Changes

- 顶栏3个点（⋯）颜色从 `var(--muted)` 改为 `var(--fg)`（纯黑色）
- 新增"⑥ 方案草稿"工作台 Tab，与对话/简报/生成/行动/下发同级，直接进入草稿列表（不走3个点菜单）
- 新增草稿列表屏：复用现有 `GET /plan/runs` 接口，过滤 `status === 'completed'` 的运行记录
- 新增草稿详情视图（点击草稿从右往左滑入）：**直接读取 checkpoint outputs**（`GET /plan/runs/{run_id}/status`），不调 LLM 摘要接口，避免每次查看重新生成
- 草稿详情复用导出 API 支持下载（PDF/XLSX）
- 草稿详情的"查看完整方案"和"下一步行动建议"按钮：恢复 run_id → 跳转对应 Tab

## Capabilities

### New Capabilities

（无新增 capability — 复用现有 plan-generation 的 API 能力）

### Modified Capabilities

- `plan-generation-workbench`: 新增移动端方案草稿 Tab、草稿列表屏、草稿详情视图（直读 DB）、3个点菜单纯黑色

## Impact

**前端**（仅移动端，PC 不受影响）：
- `MobileWorkbenchPage.tsx`：TABS 增加 draft-list；draft-list 作为 display-toggled 屏；3个点菜单恢复 export-gated（移除草稿项，保留纯黑色）
- `ScreenDraftList.tsx`：草稿列表 + 详情双视图；详情改用 `getPlanRunStatus`（直读 outputs），不再用 `getPlanSummary`
- `mobile-workbench.css`：`.ico` 颜色纯黑色，`.mrd-*` 草稿样式

**后端**：无改动（复用现有 `GET /plan/runs`、`GET /plan/runs/{run_id}/status`、导出 API）

**Non-goals**：
- 草稿编辑/删除/命名
- PC 端草稿列表
- 草稿详情用 LLM 摘要（改为直读 DB；方案生成页"生成结果"仍用 LLM summary，不在本次改动范围）
