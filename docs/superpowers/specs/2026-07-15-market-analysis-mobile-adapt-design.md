# 市场分析组件移动端 CSS 适配

## 背景

`MarketResearchProgressCard` 和 `MarketResearchResultCards` 在 `variant='mobile'` 传入时，仅做了最基础的 `max-h` 调整，大部分样式（padding、grid 布局、字体大小）沿用桌面端，在 360px 手机壳内显得过宽、padding 浪费空间、三列布局挤在一起。

## 设计

### 规则

所有改动只在 `variant === 'mobile'` 条件分支内生效，不影响桌面端。

### 具体调整

**MarketResearchProgressCard：**
- 搜索来源窗口：`max-h-[20vh]` → `max-h-[30vh]`
- 进度日志窗口：`max-h-[20vh]` → `max-h-[30vh]`

**MarketResearchResultCards 容器：**
- `space-y-4` → `space-y-3`

**MarketSummaryCard（移动端）：**
- `p-4` → `p-3`
- `text-lg` → `text-base`

**MarketSizeCard（移动端）：**
- `p-4` → `p-3`
- `grid-cols-3` → `grid-cols-1`（TAM/SAM/SOM 垂直堆叠）
- `text-sm` 数字 → `text-base`（单行更宽敞）

**TrendSignalsCard（移动端）：**
- `p-4` → `p-3`
- title `text-sm` → `text-xs`，以适应更窄宽度

**TargetUsersCard（移动端）：**
- `p-4` → `p-3`
- `space-y-4` → `space-y-3`

**OpportunityCard（移动端）：**
- `p-4` → `p-3`
- 评级标签 `flex-wrap gap-3` → `flex-col`（堆叠）

**EvidenceCard（移动端）：**
- `p-4` → `p-3`
