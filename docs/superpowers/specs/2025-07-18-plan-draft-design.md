# 移动端方案草稿列表 + 草稿详情页 — Brainstorming Design Doc

> 状态：草稿（待 /opsx:explore 澄清）
> 日期：2025-07-18
> 触发：用户反馈"3个点颜色太浅 + 需要方案草稿列表入口 + 草稿详情页"

## 1. 需求拆解

| # | 需求 | 类型 |
|---|------|------|
| 1 | 顶栏3个点（⋯）颜色太浅，改为纯黑色 | UI 微调 |
| 2 | 3个点菜单中增加"方案草稿"入口，放到导出选项后面 | 新功能入口 |
| 3 | 方案生成页方案完整出现后自动保存为草稿 | 自动保存逻辑 |
| 4 | 点击某条草稿 → 新页面（从右往左覆盖动画） | 草稿详情页 |
| 5 | 详情页内容 = 方案生成页"生成结果"区域（摘要卡片 + 查看完整方案 + 下一步建议），样式一致 | 页面复用 |
| 6 | 详情页顶栏3个点中也有下载功能（PDF/XLSX） | 下载功能 |

## 2. 现状分析

### 顶栏 `.ico` 颜色
- CSS: `.mw .topbar .ico { color: var(--muted) }` → `#6b7280`（灰色）
- 需改为 `color: var(--fg)` → `#111111`（近纯黑）

### 3个点菜单
- 当前仅在 `isExportReady`（screen === 'generate' || 'preview'，且 status === 'completed'）时显示
- 菜单项：导出 PDF、导出 XLSX
- **问题**：如果"方案草稿"也在这个菜单里，那只有生成完方案后才能看草稿。是否应该让3个点始终可点击，草稿入口始终可用？

### "生成结果"区域（ScreenGenerate:229-342）
- 触发条件：`chapters.length > 0 && status === 'completed'`
- 内容：
  1. `getPlanSummary(run_id)` → 策略定位卡片、执行规划卡片、核心 KPI 卡片、行动建议卡片
  2. "查看完整方案" → `onNavigate('preview')`
  3. "下一步行动建议" → `onNavigate('actions')`

### 现有数据资产
- `run_id` 已在后端持久化（SQLite checkpoint + JSON outputs）
- `listPlanRuns(limit)` API 已有 → 返回历史运行记录
- `getPlanSummary(run_id)` API 已有 → 返回摘要数据
- `exportPlanPdf(run_id)` / `exportPlanXlsx(run_id)` API 已有
- `restoreFromRunId(run_id)` 前端函数已有 → 从 run_id 恢复完整状态

## 3. 关键设计问题

### Q1: 3个点菜单何时可见？

**现状**：仅在 generate/preview 屏 + 方案完成时。
**方案 A**：保持现状，草稿入口只在生成完成后可见（一致性强但入口深）
**方案 B**：3个点始终可见（chat/brief 等屏也有），菜单项按状态动态显示：
  - 任何屏：方案草稿（始终可见）
  - generate/preview + completed：导出 PDF、导出 XLSX

推荐 **B**：草稿是独立功能，不应依赖当前是否有完成方案。但这改变了现有行为，需要用户确认。

### Q2: 草稿存储方案？

**方案 A：轻量注册表**（推荐）
- 后端新增 `drafts.json` 注册表：`[{run_id, brand_name, product, category, created_at}]`
- 不重复存储方案数据，detail 页通过现有 `listPlanRuns` / `getPlanSummary` 拉取
- Auto-save 触发：前端检测到 `status === 'completed' && chapters.length > 0` 时调 `POST /plan-drafts`
- 去重：同一 `run_id` 不重复保存

**方案 B：纯前端 localStorage**
- 在前端 localStorage 维护草稿列表
- 问题：清除 localStorage 丢失草稿、跨设备不同步
- 不推荐

### Q3: 草稿详情页的"查看完整方案"和"下一步建议"如何跳转？

详情页是覆盖层（overlay），跳转需要：
1. 关闭详情页覆盖层
2. 恢复 draft 的 `run_id` 到 `useMobilePlanRun`
3. 切换到对应 tab（preview 或 actions）

这与现有的覆盖层返回逻辑一致（如 budget-preview 返回 → approve → 切回 generate）。

### Q4: 草稿详情页的下载功能

复用现有 `exportPlanPdf` / `exportPlanXlsx`，但使用草稿的 `run_id` 而非 `allygo_mobile_plan_run_id`。需要在覆盖层的顶栏3个点中嵌入下载按钮。

## 4. 架构草图

```
MobileWorkbenchPage
├── topbar (.ico 纯黑色)
│   └── 3-dot menu
│       ├── 导出 PDF (仅 generate/preview + completed)
│       ├── 导出 XLSX (仅 generate/preview + completed)
│       └── 方案草稿 ← 新增（始终可见）
│
├── ScreenGenerate
│   └── 生成结果区域 (status === 'completed')
│       └── 自动保存草稿 (POST /plan-drafts, 首次完成时)
│
├── 草稿列表覆盖层 (slide-in-right) ← 新增
│   ├── 顶栏: "方案草稿" + 返回
│   └── 草稿列表 (GET /plan-drafts)
│       └── 点击草稿 → 打开草稿详情覆盖层
│
└── 草稿详情覆盖层 (slide-in-right) ← 新增
    ├── 顶栏: "{品牌名}·{产品名}" + 3-dot (PDF/XLSX 下载) + 返回
    └── 生成结果内容
        ├── 策略定位卡片
        ├── 执行规划卡片
        ├── 核心 KPI 卡片
        ├── 行动建议卡片
        ├── "查看完整方案" → 关闭覆盖层 + 恢复 run_id + 跳 preview
        └── "下一步行动建议" → 关闭覆盖层 + 恢复 run_id + 跳 actions
```

## 5. 组件设计

### ScreenDraftList（新增）
- Props: `onSelectDraft(runId: string) => void`, `onBack() => void`
- 加载态：GET /plan-drafts → skeleton
- 空态："暂无方案草稿，完成方案生成后自动保存"
- 列表项：品牌名 · 产品名 + 创建时间（相对时间：2小时前、昨天等）
- 样式：复用 `.mw .plancard` 语言

### ScreenDraftDetail（新增）
- Props: `runId`, `fallbackTitle`, `onBack`, `onRestorePlan(runId) => void`
- 加载：GET /plan-summary → 渲染摘要卡片
- 顶栏3个点：导出 PDF + 导出 XLSX（同 MobileWorkbenchPage 现有逻辑）
- 复用 ScreenGenerate 中 229-342 行的 JSX（提取为共享组件或直接复制样式）

### 自动保存逻辑
在 ScreenGenerate 的 `useEffect` (status === 'completed') 中，首次完成时调用 `POST /plan-drafts`。
- 去重：localStorage 记录已保存的 run_id，同一 run_id 不重复调用

## 6. 后端 API 设计

### POST /plan-drafts
- Body: `{ run_id: string }`
- 后端从 checkpoint DB 读取 brand_input 提取 brand_name/product/category
- 追加到 `drafts.json`
- 去重：同一 run_id 不重复追加

### GET /plan-drafts
- 返回 `[{ run_id, brand_name, product, category, created_at }]`
- 按 created_at DESC 排序

### DELETE /plan-drafts/{run_id}（可选，MVP 可不做）
- 从 drafts.json 移除

## 7. 数据流

```
方案完成 (ScreenGenerate)
  → useEffect 检测 status === 'completed'
  → 检查 localStorage: 是否已保存此 run_id
  → 未保存 → POST /plan-drafts { run_id }
  → localStorage 记录已保存

3-dot → 方案草稿
  → 打开草稿列表覆盖层
  → GET /plan-drafts → 渲染列表

点击草稿
  → 打开草稿详情覆盖层（堆叠在草稿列表之上）
  → GET /plan-summary/{run_id} → 渲染摘要卡片

详情页"查看完整方案"
  → onRestorePlan(run_id)
  → 恢复 run_id + 切回 generate → 跳 preview

详情页3-dot → 导出 PDF/XLSX
  → exportPlanPdf/Xlsx(run_id) → 下载
```

## 8. 动画

复用 research-report 的 slide-in-right / slide-out-right 模式：
- `draft-list-slide-in` / `draft-list-slide-out`
- `draft-detail-slide-in` / `draft-detail-slide-out`
- 关键帧复用 `slide-in-right` / `slide-out-right`

覆盖层堆叠：
- 草稿列表 zIndex: 40
- 草稿详情 zIndex: 45（叠在列表之上）
- 返回时先关详情（45→消失），再关列表（40→消失）

## 9. 测试策略

- 后端：POST/GET drafts 去重、空列表、排序
- 前端：ScreenDraftList 渲染空态/列表态、ScreenDraftDetail 摘要渲染、下载按钮触发
- 自动保存：模拟完成态、验证 API 调用

## 10. 范围边界

**In scope（plan-generation）**：
- 草稿列表、草稿详情、自动保存、下载
- 3-dot 颜色修复

**Out of scope**：
- 草稿编辑/删除（MVP 不做）
- 草稿命名/重命名
- 草稿同步到 PC 端（PC 端不受影响）
- 草稿过期/TTL 清理

## 11. 风险与约束

1. **覆盖层堆叠**：草稿列表和草稿详情两层覆盖层嵌套，返回逻辑需要正确处理（详情返回→列表，列表返回→原屏）
2. **run_id 数据可用性**：草稿引用的 run_id 必须在后端持久化，否则详情页拉不到数据。现有架构已保证 run 持久化（SQLite checkpoint）。
3. **3个点菜单可见性变更**：如果选择方案 B（始终可见），需确保 chat/brief 等屏的3个点不会引起用户困惑。
