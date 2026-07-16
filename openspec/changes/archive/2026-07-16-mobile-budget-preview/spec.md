# 变更 | mobile-budget-preview

## 影响范围

- `frontend/src/pages/mobile-workbench/ScreenGenerate.tsx` — ✅ 已修改
- `frontend/src/pages/mobile-workbench/ScreenBudgetPreview.tsx` — ✅ 已新建
- `frontend/src/pages/mobile-workbench/MobileWorkbenchPage.tsx` — ✅ 已修改
- `frontend/src/pages/mobile-workbench/ScreenChat.tsx` — ✅ 已修改
- `frontend/src/hooks/useMobilePlanRun.ts` — ✅ 已修改

## 新增

| 项目 | 说明 |
|------|------|
| `ScreenBudgetPreview` 组件 | 全屏预算预览页面 |
| `MobileScreen` 类型枚举值 `'budget-preview'` | 新屏幕路由 |
| `approveWithBudget()` 方法 | 携带调整后预算数据的审批 |
| `onOpenBudgetPreview` prop | ScreenGenerate 到父级的跳转回调 |
| CSS 变量（全屏覆盖模式） | 通过 `position:fixed` 在 PhoneFrame 外部渲染 |

## 修改

| 文件 | 改动 |
|------|------|
| `ScreenGenerate.tsx` | 弹窗从 200+ 行简化为 ~100 行，删除预算分配/KPI/里程碑区块 |
| `MobileWorkbenchPage.tsx` | 新增 budget-preview 路由、Tab/顶栏隐藏、数据传递 |
| `useMobilePlanRun.ts` | approve() 增加可选参数、新增 approveWithBudget() |
| `ScreenChat.tsx` | MobileScreen 联合类型增加 budget-preview |

## 删除

- ScreenGenerate.tsx 内 budget_kpi 结果弹窗中的预算分配、KPI 网格、里程碑区块（移至新页面）

## 注意

- 预算预览页使用 `position:fixed` 全屏覆盖，独立于 PhoneFrame 容器，避免滚动冲突
- KPI 联动公式和里程碑预算分配均为前端计算，不涉及后端改动
- 调整后的预算数据通过 `edited_input.budget_kpi_adjusted` 传递给后端 approve 端点
