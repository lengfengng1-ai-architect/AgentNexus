## Why

移动端方案生成屏右上角的三点菜单（⋯）点击后没有反应，用户无法导出方案文档。需要给该菜单添加「导出 PDF」和「导出 XLSX」功能，对接已存在的后端生成能力。

## What Changes

- 前端 MobileWorkbenchPage 中 ⋯ 图标改为可点击，弹出下拉菜单含两个导出按钮
- 点「导出 PDF」调用 `POST /plan/runs/{run_id}/export-pdf`，下载 PDF 文件
- 点「导出 XLSX」调用 `POST /plan/runs/{run_id}/export-xlsx`，下载 XLSX 文件
- 后端的 XLSX 文件已在 plan_generator agent 执行时生成并存于 checkpoint，导出时直接从磁盘返回，无需重新调用 LLM
- 后端新增 PDF 生成服务，用 ReportLab 从 checkpoint 数据构建 PDF

## Capabilities

### New Capabilities
- `plan-export-pdf`: 方案 PDF 导出，从 checkpoint agent 数据生成 PDF 文档
- `plan-export-xlsx`: 方案 XLSX 导出，复用 pipeline 中已生成的文件

### Modified Capabilities
- `plan-generation`: 修改 plan router，新增 export-xlsx/export-pdf 两个端点
- `mobile-workbench-preview`: MobileWorkbenchPage 添加导出菜单 UI

## Impact

| 层面 | 影响 |
|------|------|
| 后端 API | 新增 `POST /plan/runs/{run_id}/export-xlsx` 和 `POST /plan/runs/{run_id}/export-pdf` |
| 后端 Service | 新增 `plan_export_service.py`，包含 PDF 生成和 XLSX 路径读取 |
| 后端依赖 | 新增 `reportlab` 包 |
| 前端 MobileWorkbenchPage | ⋯ 图标添加下拉菜单，两个导出按钮，触发下载 |
| 前端 API | 新增 `exportPlanXlsx(runId)` 和 `exportPlanPdf(runId)` 函数 |
