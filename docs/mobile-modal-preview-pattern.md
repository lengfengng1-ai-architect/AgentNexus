# 移动端弹窗 → 预览页设计模式

## 概述

本文档记录了"预算与KPI"弹窗及其全屏预览页面的设计和实现模式。
后续如需为其他节点（如市场分析、行动建议等）添加类似功能，可参考此模式。

---

## 一、整体架构

```
后端 Stream Event (workflow.paused)
    ↓
MobileWorkbenchPage (路由层)
    ├── 渲染 ScreenGenerate (含弹窗)
    │     └── 弹窗内含"预览预算"按钮
    │           └── 调用 onOpenBudgetPreview(data) 跳转
    └── 渲染 ScreenBudgetPreview (全屏覆盖层)
          └── 用户在预览页操作后，通过 onBack(data) 返回
          └── 带 slide-in/slide-out 动画
```

**关键原则：**
- 弹窗和预览页是平级关系，都渲染在 PhoneFrame 内部
- 预览页通过 `position: absolute; inset: 0` 全屏覆盖手机框内部，并非覆盖整个页面
- 预览页带有从右向左的滑入动画和从左向右的滑出动画
- 返回时通过回调传递数据给父组件，同时被抑制的 checkpoint 弹窗不会重新弹出

---

## 二、弹窗（ScreenGenerate.tsx 内）

### 2.1 弹窗容器

```tsx
{showModal && <div style={{
  position: 'absolute', inset: 0, zIndex: 50,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}}>
  <div style={{
    width: 300, borderRadius: 'var(--r-lg)',
    boxShadow: '0 12px 40px var(--shadow-lg)',
    overflow: 'hidden', background: 'var(--bg)',
    maxHeight: '68vh',
    animation: 'bksi 0.35s cubic-bezier(0.16,1,0.3,1) both',
  }}>
```

> **注意：** 弹窗容器没有 `background` 遮罩，内容直接浮在流水线上方。

### 2.2 弹窗外观—通用弹窗（非 budget_kpi）

```
┌──────────────────────────────┐
│          即将执行              │
│       数据查询                 │
│                               │
│  ┌────────────┐ ┌───────────┐ │
│  │ ✓ 确认继续  │ │ ✕ 驳回重跑 │ │
│  └────────────┘ └───────────┘ │
└──────────────────────────────┘
```

### 2.3 弹窗外观—budget_kpi 结果弹窗

```
┌──────────────────────────────┐
│       📊 预算与 KPI            │
│                               │
│  ┌──────────┐ ┌───────────┐  │
│  │ 预览预算  │ │ 确认继续   │  │
│  └──────────┘ └───────────┘  │
└──────────────────────────────┘
```

### 2.4 按钮交互

| 按钮 | 行为 |
|------|------|
| **预览预算** | 提取 `pausedSnapshot.upstream_outputs` 中对应节点的数据，调用 `onOpenBudgetPreview(data)` 跳转到全屏预览页 |
| **确认继续** | 调用 `handleApprove()` → 后端 `POST /plan/runs/{runId}/approve` |
| **驳回重跑** | 显示文本输入框，提交理由给后端 `POST /plan/runs/{runId}/reject` |

### 2.5 suppressCheckpoint prop

ScreenGenerate 接受可选的 `suppressCheckpoint` prop，用于抑制 checkpoint 弹窗显示：

```tsx
interface ScreenGenerateProps {
  onNavigate: (s: MobileScreen, data?: BriefFormData) => void
  briefData: BriefFormData | null
  planRun: MobilePlanRunAPI
  suppressCheckpoint?: boolean       // ← 新增
  onOpenBudgetPreview: (data: {...}) => void
}
```

`showModal` 条件变为：

```tsx
const showModal = status === 'paused' && pausedSnapshot !== null && !suppressCheckpoint
```

当用户从预算预览返回 generate 屏时，`suppressCheckpoint=true` 避免 paused 状态下的 checkpoint 弹窗再次弹出，用户看到的是流水线继续执行的运行中状态。

### 2.6 数据提取

```tsx
const allocs = (bk?.allocations as Array<{category:string; percentage:number; amount:number}> | undefined) || []
const kpis = (bk?.kpis as Record<string, string>) || {}
const timeline = (bk?.timeline as string[]) || []

onOpenBudgetPreview({
  totalBudget: (bk?.total_budget as number) || 0,
  periodMonths: (bk?.period_months as number) || 0,
  allocations: allocs,
  kpis,
  timeline,
})
```

---

## 三、父组件路由（MobileWorkbenchPage.tsx）

### 3.1 状态管理

```tsx
// 预算预览数据
const [budgetPreviewData, setBudgetPreviewData] = useState<{
  totalBudget: number
  periodMonths: number
  allocations: BudgetAllocation[]
  kpis: Record<string, string>
  timeline: string[]
} | null>(null)

// 预算预览滑动动画状态
const [suppressCheckpoint, setSuppressCheckpoint] = useState(false)
// 预算预览正在退出动画中
const [isBpAnimatingOut, setIsBpAnimatingOut] = useState(false)

// computed
const hideTopbar = screen === 'budget-preview' || isBpAnimatingOut
const showingBudgetPreview = screen === 'budget-preview' || isBpAnimatingOut
```

### 3.2 跳转到预览页

```tsx
onOpenBudgetPreview={(data) => {
  setBudgetPreviewData(data)
  setSuppressCheckpoint(true)       // 抑制 checkpoint 弹窗
  setScreen('budget-preview')
}}
```

### 3.3 从预览页返回（带动画）

```tsx
const handleBudgetPreviewBack = (allocations: BudgetAllocation[]) => {
  // 1. 触发滑出动画的同时开始提交流程
  setIsBpAnimatingOut(true)
  const rid = localStorage.getItem('allygo_mobile_plan_run_id')
  if (rid) {
    planRun.approveWithBudget(allocations)
  }
  // 2. 等待动画结束后切换屏幕
  setTimeout(() => {
    setIsBpAnimatingOut(false)
    setBudgetPreviewData(null)
    setScreen('generate')
    setSuppressCheckpoint(true)     // 抑制相同 checkpoint
  }, 300) // 匹配滑出动画时长 0.3s
}
```

### 3.4 自动清除抑制

```tsx
// 流水线脱离 paused 状态时清除抑制
useEffect(() => {
  if (status !== 'paused') {
    setSuppressCheckpoint(false)
  }
}, [status])

// 非 budget_kpi 的新节点到达时清除抑制
useEffect(() => {
  if (planRun.pausedSnapshot && planRun.pausedSnapshot.node_id !== 'budget_kpi') {
    setSuppressCheckpoint(false)
  }
}, [planRun.pausedSnapshot])
```

### 3.5 渲染预览页（覆盖层 + 滑动动画）

预算预览作为绝对定位覆盖层渲染在 PhoneFrame 内部，带 slide-in/slide-out 动画：

```tsx
<PhoneFrame topbar={hideTopbar ? undefined : topbar}>
  {/* 预算预览覆盖层 */}
  {showingBudgetPreview && budgetPreviewData && (
    <div
      className={isBpAnimatingOut ? 'bp-slide-out' : 'bp-slide-in'}
      style={{
        position: 'absolute', inset: 0, zIndex: 40,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg)', overflow: 'hidden',
      }}
    >
      <ScreenBudgetPreview
        onNavigate={setScreen}
        totalBudget={budgetPreviewData.totalBudget}
        periodMonths={budgetPreviewData.periodMonths}
        initialAllocations={budgetPreviewData.allocations}
        initialKpis={budgetPreviewData.kpis}
        initialTimeline={budgetPreviewData.timeline}
        onBack={handleBudgetPreviewBack}
      />
    </div>
  )}
  {/* 其他屏始终保持挂载（不条件渲染），只是 display:none 切换 */}
  <div style={{ display: screen === 'generate' ? '' : 'none' }}>
    <ScreenGenerate
      suppressCheckpoint={suppressCheckpoint}
      ...
    />
  </div>
  ...
</PhoneFrame>
```

**关键设计决策：** 其他屏不依赖 `!showingBudgetPreview` 做条件渲染，始终保持挂载。预算预览覆盖层通过 `position: absolute` 浮在其他内容上方，确保其他屏的 state（如聊天记录）不会丢失。

### 3.6 隐藏 Tab 和顶栏

在 `MobileScreen` 类型中新增 `'budget-preview'`，然后在 Tab 栏通过 `HIDE_TABS` 数组隐藏：

```tsx
const HIDE_TABS: MobileScreen[] = ['preview', 'budget-preview']
// ...
<div className="mw-tabs" style={{ display: HIDE_TABS.includes(screen) ? 'none' : '' }}>
```

动画退出期间 `hideTopbar` 也为 true，避免顶栏过早出现破坏视觉连贯性。

---

## 四、全屏预览页（ScreenBudgetPreview.tsx）

### 4.1 Props 接口

```tsx
interface Props {
  onNavigate: (s: MobileScreen) => void
  totalBudget: number
  periodMonths: number
  initialAllocations: BudgetAllocation[]
  initialKpis: Record<string, string>
  initialTimeline: string[]
  onBack: (allocations: BudgetAllocation[]) => void
}
```

### 4.2 页面结构

```
┌─── 顶栏（含 ‹ 返回按钮）────────
│ ‹ 页面标题
├─── 滚动内容区 ──────────────────
│   0. [可编辑总预算 + 执行周期]     ← 数字输入框
│   1. 交互式饼图 + 图例            ← SVG + 拖拽
│   2. 核心 KPI 指标                ← 2×2 网格
│   3. 关键里程碑卡片                ← 卡片列表
├─── 底部固定栏 ──────────────────
│ [输入备注…] [↵ 发送]
└─────────────────────────────────
```

### 4.3 交互式饼图

- **实现**：纯 SVG、无第三方库，用 `path` 元素绘制扇形
- **拖拽**：监听 `mousedown/mousemove/mouseup` 和 `touchstart/touchmove/touchend`
- **高亮**：拖拽/悬停时扇区外扩 6px，stroke-width 加粗
- **tooltip**：拖拽时跟随鼠标显示"类别 + 百分比"
- **重算**：被拖拽项比例变化后，其他项按比例自动平衡，确保总和 100%

```tsx
// 核心拖拽公式
const delta = 当前角度 - 起始角度
let newPct = 原百分比 + (delta / (2π)) × 80
newPct = Math.max(3, Math.min(newPct, 85))
// 其他项按比例摊分差额
const others = 其他项
const diff = newPct - 当前项百分比
others.forEach(a => {
  a.percentage = Math.max(1, a.percentage - diff × (a.percentage / othersTotal))
})
// 归一化确保总和 100
分配项.forEach(a => { a.percentage = a.percentage / sum × 100 })
```

### 4.4 KPI 联动

- **基准值**：从后端 LLM 生成的 `kpis` 字段解析
- **缩放**：按 `editableBudget / initialBudget` 比例缩放
- **权重映射**：各 KPI 对不同预算类别的敏感度不同

```tsx
曝光量 = 基准 × 缩放比 × (0.2 + 0.6×平台投放%/20% + 0.2×活动执行%/30%)
点击量 = 基准 × 缩放比 × (0.3 + 0.5×平台投放%/20% + 0.2×内容制作%/20%)
转化量 = 基准 × 缩放比 × (0.2 + 0.5×内容制作%/20% + 0.15×活动执行%/30% + 0.15×运营资源%/10%)
互动量 = 基准 × 缩放比 × (0.3 + 0.5×达人合作%/25% + 0.2×活动执行%/30%)
```

### 4.5 里程碑

- **三段式**：预热期 📢 / 爆发期 🚀 / 收尾期 📊
- **内容**：根据预算类别的占比最高项，从预设模板矩阵取文案
- **模板矩阵**：

```tsx
const STAGE_TASKS = {
  '达人合作': ['筛选签约核心达人矩阵', '达人内容共创与全渠道发布', '达人效果复盘与长尾二创'],
  '内容制作': ['创意概念打磨与素材批量拍摄', '多版本内容制作与 A/B 测试', '爆款内容二次加工与沉淀'],
  '活动执行': ['活动场地确认与物料筹备预售', '线下活动全面引爆与线上同步', '活动热度延续与案例包装'],
  '平台投放': ['投放策略制定与定向测试', '全渠道精准放量与预算优化', '投放数据回收与ROI分析'],
  '运营资源': ['社群预热招募与种子用户积累', '互动活动持续运营与裂变', '数据复盘与案例沉淀包装'],
}
```

- **时间分配**：按预算权重 `[达人+内容, 活动+投放, 运营]` 等比例切分总月份
- **预算分配**：同套权重计算各阶段金额
- **尾差补偿**：里程碑预算使用"前 n-1 项 `Math.round` + 最后一项取余数"的策略，确保三个阶段金额之和精确等于总预算：

```tsx
// 前两项四舍五入
milestones.forEach((m, i) => {
  if (i < milestones.length - 1) {
    m.budget = Math.round(editableBudget * stageWeights[i] / totalW)
  }
})
// 最后一项 = 总预算 - 前面之和
const sumPrev = milestones.slice(0, -1).reduce((s, m) => s + m.budget, 0)
milestones[milestones.length - 1].budget = Math.max(0, editableBudget - sumPrev)
```

### 4.6 可编辑的总预算和周期

- 页面顶部两个数字输入框
- 改总预算 → 图例金额、KPI、里程碑金额同步缩放
- 改周期 → 里程碑时间段按权重重新切分

### 4.7 返回数据

```tsx
const handleBack = () => {
  const finalData = allocsWithAmount.map(a => ({
    category: a.category,
    percentage: Math.round(a.percentage * 10) / 10,
    amount: a.amount,
  }))
  onBack(finalData)  // 触发 approve
}
```

### 4.8 重新生成（反馈 → 重新执行 budget_kpi agent）

用户输入自然语言反馈 → 触发 reject 流程重新执行 budget_kpi agent → 点击"↵"后立即显示 loading 覆盖层 → SSE 收到新 pausedSnapshot 后原地刷新。

```tsx
// 新增 Props
interface ScreenBudgetPreviewProps {
  // ...
  loading?: boolean                              // 是否正在重新生成
  onRegenerate?: (feedback: string) => void      // 用户输入反馈后触发
}

// 发送按钮不再是 console.log + onBack，改为调用 onRegenerate
const handleSendFeedback = () => {
  if (!feedback.trim()) return
  onRegenerate?.(feedback.trim())
}
```

**loading 覆盖层：**
- 白色半透明遮罩 `rgba(255,255,255,0.85)` 盖在内容上方
- 旋转动画 + "正在根据反馈重新生成…" 文案
- 底部输入栏保留但禁用（`disabled` + `opacity: 0.5`），防止重复提交

**MobileWorkbenchPage 侧的配合：**

```tsx
// 重新生成处理
const handleBudgetRegen = (feedback: string) => {
  setBudgetPreviewLoading(true)
  planRun.reject(feedback)  // → SSE → budget_kpi agent 重新执行
}

// 监控 SSE 返回的新 paused 数据
useEffect(() => {
  if (!budgetPreviewLoading) return
  if (!planRun.pausedSnapshot) return
  const bk = planRun.pausedSnapshot.upstream_outputs?.budget_kpi
  if (!bk || typeof bk.total_budget === 'undefined') return
  // 提取新数据刷新 budgetPreviewData → 预览页原地重渲染
  setBudgetPreviewData({
    totalBudget: bk.total_budget,
    periodMonths: bk.period_months,
    allocations: bk.allocations,
    kpis: bk.kpis,
    timeline: bk.timeline,
  })
  setBudgetPreviewLoading(false)
}, [budgetPreviewLoading, planRun.pausedSnapshot])
```

**数据流：**

```
用户输入自然语言 → ↵ 发送
  ↓ loading=true，显示转圈覆盖层
  ↓ planRun.reject(feedback) → POST /plan/runs/{runId}/reject
  ↓ SSE 流：budget_kpi agent 重新执行（反馈注入 prompt）
  ↓ SSE: workflow.paused（新 budget_kpi 数据）
  ↓ useEffect 检测 pausedSnapshot 变化 → 提取新数据
  ↓ setBudgetPreviewData → 预览页原地重渲染
  ↓ loading=false，转圈消失
```

---

## 五、Hook 扩展（useMobilePlanRun.ts）

```tsx
// approve 支持可选参数传递调整后的数据
const approve = useCallback(async (budgetAllocations?: BudgetAllocation[]) => {
  const input = budgetAllocations
    ? { edited_input: { budget_kpi_adjusted: budgetAllocations } }
    : undefined
  const stream = await approvePlanRun(rid, input)
  // ...
}, [])

// 便捷方法
const approveWithBudget = useCallback((allocs: BudgetAllocation[]) => {
  approve(allocs)
}, [approve])
```

---

## 六、弹窗动画

### 6.1 弹窗滑入（bksi）

```css
@keyframes bksi {
  from { transform: translateX(100%) }
  to { transform: translateX(0) }
}
```

弹窗容器使用 `animation: 'bksi 0.35s cubic-bezier(0.16,1,0.3,1) both'`

### 6.2 预算预览覆盖层滑动动画

从右向左滑入、从左向右滑出：

```css
@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
@keyframes slide-out-right {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}
.mw .bp-slide-in {
  animation: slide-in-right 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.mw .bp-slide-out {
  animation: slide-out-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .mw .bp-slide-in,
  .mw .bp-slide-out {
    animation: none;
  }
  .mw .bp-slide-out { display: none; }
}
```

---

## 七、样式约定

- **弹窗宽度**：300px
- **弹窗圆角**：`var(--r-lg)`（16px）
- **弹窗无遮罩层**：不再设置 `background: rgba(15, 23, 42, 0.35)`
- **按钮高度**：40px（弹窗内所有按钮统一高度）
- **按钮间距**：`gap: 10`
- **颜色**：使用 CSS 变量 `var(--bg)`, `var(--accent)`, `var(--surface)` 等
- **字体**：`var(--ff)`
- **阴影**：`0 12px 40px var(--shadow-lg)`
- **手机框尺寸**：360px × 780px（由 PhoneFrame 控制）
- **PhoneFrame 的 .screen 容器**：设置 `position: relative`，为绝对定位覆盖层提供锚点

---

## 八、数据流总结

### 8.1 正常返回（用户点"‹"返回）

```
LLM (budget_kpi agent)
  ↓ 生成 JSON
BudgetKpiOutput (后端)
  ↓ workflow.paused SSE event
pausedSnapshot.upstream_outputs.budget_kpi
  ↓ ScreenGenerate 弹窗读取
onOpenBudgetPreview({totalBudget, periodMonths, allocations, kpis, timeline})
  ↓ MobileWorkbenchPage 路由
  ↓ 弹窗关闭 + setSuppressCheckpoint(true)
ScreenBudgetPreview (全屏覆盖层，带 slide-in 动画)
  ↓ 用户调整后点击"‹"返回
handleBudgetPreviewBack(data)  ← 同时触发 slide-out 动画
  ├─ setIsBpAnimatingOut(true)
  ├─ planRun.approveWithBudget(data)  ← SSE 在动画期间开始
  └─ 300ms 后 → 切回 generate 屏 + setSuppressCheckpoint(true)
  ↓ POST /plan/runs/{runId}/approve { edited_input: { budget_kpi_adjusted } }
  ↓ SSE 收到 workflow.resume / node.start
  ↓ status → 'running' → useEffect 清除 suppressCheckpoint
后端继续流水线
  ↓ 用户看到的是下一个节点正在执行中的状态，无弹窗干扰
```

### 8.2 重新生成（用户点"↵"发送反馈）

```
用户输入自然语言反馈 → 点"↵"发送
  ↓ ScreenBudgetPreview.handleSendFeedback()
  ↓ onRegenerate(feedback)
  ↓ setBudgetPreviewLoading(true) + planRun.reject(feedback)
  ↓ 显示 loading 覆盖层："正在根据反馈重新生成…"
  ↓ POST /plan/runs/{runId}/reject { reason: feedback }
  ↓ SSE 流
  ↓ budget_kpi agent 重新执行（feedback 注入 prompt 的 _reject_reason）
  ↓ SSE: workflow.paused（新 budget_kpi 数据 + budget_kpi 节点已执行完毕）
  ↓ MobileWorkbenchPage useEffect 检测到 pausedSnapshot 更新
  ↓ 提取新数据 → setBudgetPreviewData
  ↓ ScreenBudgetPreview: initial 数据变化 → useEffect 重置内部状态
  ↓ loading=false，loading 覆盖层消失
  ↓ 用户看到新的预算分配/饼图/KPI/里程碑
```

### 8.3 完整数据流图

```
                    ┌──────────────────────┐
                    │  LLM (budget_kpi)     │
                    └──────────┬───────────┘
                               │ workflow.paused SSE
                               ▼
              ┌──────────────────────────────┐
              │ pausedSnapshot.upstream_     │
              │ outputs.budget_kpi           │
              └──────┬───────────────────────┘
                     │ onOpenBudgetPreview(data)
                     ▼
      ┌──────────────────────────────┐
      │      ScreenBudgetPreview      │
      │  ┌─────┐  ┌──────┐  ┌─────┐ │
      │  │ 饼图 │  │ KPI │  │里程碑│ │
      │  └─────┘  └──────┘  └─────┘ │
      │  ┌─── 底部 ──────────────┐  │
      │  │ 输入框  ← 自然语言    │  │
      │  └───────────────────────┘  │
      └────┬──────────────────┬──────┘
           │ "‹" 返回          │ "↵" 发送反馈
           ▼                   ▼
  approveWithBudget(data)    reject(feedback)
           │                   │
           ▼                   ▼
  SSE: workflow.resume    SSE: budget_kpi agent 重跑
           │                   │
           ▼                   │
  后端继续                   SSE: workflow.paused
           │              (新 budget_kpi 数据)
           │                   │
           │                   ▼
           │           setBudgetPreviewData(新数据)
           │                   │
           │                   ▼
           │           ScreenBudgetPreview 重渲染
           │           loading=false
           │
           └────── 两种路径都可回到 generate 屏 ──────
```
