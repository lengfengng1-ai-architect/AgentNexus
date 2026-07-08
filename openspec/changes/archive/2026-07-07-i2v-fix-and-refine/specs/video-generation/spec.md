## MODIFIED Requirements

### Requirement: SSE progress SHALL 包含估算百分比

系统 SHALL 在每次 progress SSE event 中附带 `progress_pct` 字段（0-100），表示视频生成进度的估算百分比。

#### Scenario: progress event 携带动态估算百分比
- **GIVEN** 视频生成任务正在轮询
- **WHEN** 系统每次 yield progress 时
- **THEN** event 数据中 SHALL 包含整数 `progress_pct` 字段
- **AND** 非终态进度计算规则为 `min(90, int(elapsed / max_poll_seconds * 90))`（最大 90%）
- **AND** `max_poll_seconds` 计算公式为 `clamp(120 + duration × 40, 180, 600)`
- **AND** 任务完成时 `progress_pct` 为 100
