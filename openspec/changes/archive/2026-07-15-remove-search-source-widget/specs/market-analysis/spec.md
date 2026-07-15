## MODIFIED Requirements

### Requirement: 搜索来源 + 进度双窗口布局

#### Scenario: 进度阶段布局（更新后）
- **WHEN** 市场分析正在进行（SSE 流未完成）
- **THEN** 上方显示 ToolCallStatusBar（蓝色搜索状态条 + spinner），下方显示进度日志窗口
- **THEN** 进度日志窗口有 max-height 限制，内容超出时显示滚动条
- **THEN** 新增日志时自动 auto-scroll 到底部

**注**：搜索来源窗口已被删除，来源卡片通过 ToolCallStatusBar 展示。
