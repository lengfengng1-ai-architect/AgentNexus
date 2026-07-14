## 概述

在后端 plan router 添加两个导出端点，新增 plan_export_service 读写已有 XLSX 和生成 PDF，前端三点菜单对接导出 API。

## 任务

### 1.1 后端导出服务

`backend/app/services/plan_export_service.py`
- `export_plan_xlsx(run_id)`：从 checkpoint 读取 `plan_generator.xlsx_path`，转绝对路径，返回文件路径
- `export_plan_pdf(run_id)`：从 checkpoint 读取 strategy/execution/budget/actions 数据，用 ReportLab 构建 PDF（封面 + 策略 + 执行 + 预算表 + 行动）

### 1.2 后端导出路由

`backend/app/routers/plan.py`
- `POST /plan/runs/{run_id}/export-xlsx` → `export_plan_xlsx`
- `POST /plan/runs/{run_id}/export-pdf` → `export_plan_pdf`
- 返回 `{ download_url, file_path }`

### 1.3 前端导出 API

`frontend/src/api/plan.ts`
- `exportPlanXlsx(runId): Promise<{download_url, file_path}>`
- `exportPlanPdf(runId): Promise<{download_url, file_path}>`

### 1.4 前端三点菜单

`frontend/src/pages/mobile-workbench/MobileWorkbenchPage.tsx`
- `showExportMenu` state + `exporting` state 控制菜单显隐/按钮禁用
- `exportRef` + `useEffect` 点击外部关闭菜单
- `handleExport(fmt)`：调用 API → 后端 origin 拼接完整 URL → `<a>` 触发下载
- 下拉框 UI：两个按钮（📄 导出 PDF / 📊 导出 XLSX）
- ⋯ 图标只在 `screen === 'generate' && status === 'completed'` 时可点击

### 1.5 依赖管理

`backend/pyproject.toml`
- 新增 `reportlab>=5.0` 依赖（已用 uv add 安装）
