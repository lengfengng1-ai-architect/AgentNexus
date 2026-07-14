# mobile-plan-preview Specification

## Purpose
TBD - created by archiving change mobile-plan-preview. Update Purpose after archive.
## Requirements
### Requirement: 查看完整方案按钮

方案生成完成（status === 'completed'）时，"生成结果"标题右侧 SHALL 显示"查看完整方案"按钮。

#### Scenario: 点击按钮跳转到预览页

- **WHEN** 用户点击"查看完整方案"
- **THEN** 应用切换到 preview 屏幕，展示完整的方案章节

#### Scenario: 方案未完成时按钮不显示

- **WHEN** 方案状态不是 completed
- **THEN** "查看完整方案"按钮不显示

### Requirement: 完整方案章节展示

ScreenPreview SHALL 在 PhoneFrame 内通过 planRun.chapters 渲染折叠式 Markdown 章节列表，与工作台 PlanPreview 行为一致。

#### Scenario: 预览页展示方案章节

- **WHEN** 用户进入 preview 屏幕
- **THEN** 页面展示带编号的折叠章节列表，前 3 章默认展开

#### Scenario: 展开和折叠全部

- **WHEN** 用户点击"展开全部"按钮
- **THEN** 所有章节展开

- **WHEN** 用户点击"折叠全部"按钮
- **THEN** 所有章节折叠

#### Scenario: 预览页返回

- **WHEN** 用户点击顶部栏返回按钮或底部"返回方案"按钮
- **THEN** 应用回到 generate 屏幕

### Requirement: 预览页三点导出菜单

预览页顶部栏 SHALL 保留三点导出菜单（PDF/XLSX），与方案生成页行为一致。

#### Scenario: 在预览页导出文件

- **WHEN** 用户在 preview 屏幕点击三点导出菜单
- **THEN** 导出功能正常触发（与 generate 屏行为一致）

