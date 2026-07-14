## Context

当前移动端方案生成屏（ScreenGenerate）在方案完成后用 PlanSummary 卡片展示摘要，但内容有限。用户需要查看与工作台一致的完整方案章节（chapters）。

## Goals / Non-Goals

**Goals:**
- 在"生成结果"标题右侧添加"查看完整方案"文字按钮
- 新增 screen `preview`，用 planRun.chapters 渲染折叠式 Markdown 章节，与工作台 PlanPreview 一致
- 保留返回导航、三点导出菜单

**Non-Goals:**
- 不改变 ScreenGenerate 的 summary 渲染逻辑（保持原样）
- 不涉及后端改动
- 不涉及外部路由

## Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| 数据源 | planRun.chapters（来自 plan_generator agent 输出） | 与工作台 PlanPreview 使用同一数据 |
| 预览容器 | PhoneFrame 内新增 screen key `preview` | 与现有切换模式一致 |
| Tab bar | 不暴露外部 tab | preview 是内部中转屏 |
| 按钮样式 | 蓝色文字"查看完整方案" | 比图标更明确功能 |

## Data Flow

```
ScreenGenerate（chapters 来自 planRun）
  └─ 点击"查看完整方案" → onNavigate('preview')
ScreenPreview（chapters 来自 props）
  └─ 用 marked 渲染 Markdown 章节内容
```

## Risks / Trade-offs

- 无 — 纯前端改动，复用现有数据
