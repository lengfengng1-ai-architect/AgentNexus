## Context

移动端方案生成完成后的右上三点菜单没有功能。用户需要一个下拉菜单，包含「导出 PDF」和「导出 XLSX」两个按钮，后端利用已有 checkpoint 数据生成或读取文件供下载。

## Goals / Non-Goals

**Goals:**
- 前端三点菜单弹出下拉框，两个导出按钮
- 后端两个导出端点（PDF 生成 + XLSX 读取）
- XLSX 导出不重复调用 LLM，直接从 pipeline 已生成的文件返回
- PDF 导出从 checkpoint 提取策略/执行/预算/行动数据，用 ReportLab 构建文档
- 前端下载触发正确指向后端（不走到 Vite dev server）

**Non-Goals:**
- 不改动 agent pipeline 结构
- 不新增 LLM 调用环节
- 不增加中文字体依赖（使用 Windows 系统字体）

## Decisions

### D1: XLSX 重新 LLM 还是读已有文件

**选择**：直接从 checkpoint 读 `plan_generator.xlsx_path`，文件已在 pipeline 生成时存在于 `generated_xlsx/` 目录。

理由：
- `plan_generator_agent.py` 的 `_generate_xlsx_from_chapters()` 已用 LLM + openpyxl 在 pipeline 运行时生成过
- 导出时重新走一遍 LLM 浪费数秒且结果一致
- xlsx_path 以 URL 路径格式（`/xlsx/xxx.xlsx`）保存在 checkpoint 中，转为文件系统路径后直接返回

### D2: PDF 使用什么工具生成

**选择**：ReportLab（而非 WeasyPrint / pdfkit / fpdf）

理由：
- 纯 Python，无系统级依赖（无需 wkhtmltopdf 等额外工具）
- 直接控制排版，从 checkpoint 数据构建内容
- 已在 pyproject.toml 中新增依赖，与项目技术栈一致

### D3: 中文显示

**选择**：运行时检测 Windows 系统字体（msyh.ttf / simsun.ttc），注册为 ReportLab CJK 字体

理由：
- 开发环境是 Windows，系统自带中文字体
- 无需额外下载/嵌入中文字体包
- 回退到 Helvetica 显示拉丁字符

### D4: download_url 指向后端

**根因**：`/xlsx/filename.pdf` 是相对路径，浏览器会拼到 Vite 开发服务器域名 `localhost:5173`，Vite 返回 SPA 的 index.html

**选择**：前端从 `VITE_API_BASE_URL` 推导后端 origin，构造完整 URL 后触发下载

## 数据流

```
三点菜单 → 导出 PDF/XLSX
    │
    ├── XLSX:
    │   POST /plan/runs/{run_id}/export-xlsx
    │       → _checkpoint_state(run_id)
    │       → plan_generator.xlsx_path (/xlsx/xxx.xlsx)
    │       → 转绝对路径 → 返回 { download_url: "/xlsx/xxx.xlsx" }
    │
    └── PDF:
        POST /plan/runs/{run_id}/export-pdf
            → _checkpoint_state(run_id)
            → 提取 strategy/execution/budget/actions
            → ReportLab 构建 PDF → 输出到 generated_xlsx/
            → 返回 { download_url: "/xlsx/xxx.pdf" }

前端:
    handleExport(fmt):
        API_BASE_URL → 后端 origin
        new URL(download_url, origin) → 完整 URL
        <a href="完整URL"> → 触发浏览器下载
```

## API 设计

### POST /plan/runs/{run_id}/export-xlsx
### POST /plan/runs/{run_id}/export-pdf

```
Request:
  POST /plan/runs/{run_id}/export-xlsx
  POST /plan/runs/{run_id}/export-pdf

Response 200:
{
  "success": true,
  "data": {
    "download_url": "/xlsx/娃哈哈_20260714_营销方案.pdf",
    "file_path": "C:/Users/.../generated_xlsx/娃哈哈_20260714_营销方案.pdf"
  }
}

Error 404:
{ "success": false, "error": { "detail": "Run xxx not found", "code": "NOT_FOUND" } }

Error 500:
{ "success": false, "error": { "detail": "PDF 导出失败: ...", "code": "INTERNAL_ERROR" } }
```

## 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `backend/app/services/plan_export_service.py` | 新增 | export_plan_xlsx（读已有文件） + export_plan_pdf（ReportLab 构建） |
| `backend/app/routers/plan.py` | 修改 | 新增两个 export 端点 |
| `backend/pyproject.toml` | 修改 | 新增 reportlab 依赖 |
| `frontend/src/api/plan.ts` | 修改 | 新增 exportPlanXlsx / exportPlanPdf |
| `frontend/src/pages/mobile-workbench/MobileWorkbenchPage.tsx` | 修改 | ⋯ 菜单 + 导出按钮 + handleExport 下载逻辑 |

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| checkpoint 中 xlsx_path 为空（pipeline 未完成） | 抛 ValueError，前端 alert 提示 |
| XLSX 文件已被清理（generated_xlsx 未纳入版本管理） | 前端 alert 提示文件不存在 |
| PDF 中文乱码 | 检测系统 CJK 字体并注册；找不到时用 Helvetica 显示拉丁字符 |
| download_url 走到 Vite dev server | 前端构造完整后端 URL 后再触发下载 |
