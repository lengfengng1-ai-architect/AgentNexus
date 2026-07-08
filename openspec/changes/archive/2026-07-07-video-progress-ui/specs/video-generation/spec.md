## MODIFIED Requirements

### Requirement: 系统 SHALL 通过 SSE 持续推送生成进度

视频生成任务创建后，轮询阶段系统 SHALL 每次轮询推送一次 progress event，确保前端持续收到状态更新。

#### Scenario: 轮询阶段持续推送 progress_pct
- **GIVEN** 视频任务已创建
- **WHEN** 系统正在轮询任务状态
- **THEN** 每次轮询结果非终态时，SHALL yield 一条 `progress` event
- **AND** event 中包含 `elapsed` 累计秒数、`stage` 状态和 `progress_pct` 估算百分比

#### Scenario: 轮询网络抖动不中断
- **GIVEN** 系统正在轮询视频任务
- **WHEN** 某次 HTTP 查询因网络原因失败
- **THEN** 系统 SHALL 跳过该次轮询，推一条 progress 提示"正在处理中"
- **AND** 系统 SHALL 在等待（前 30s 每 5s，之后每 10s）后继续下一次轮询

### ADDED Requirements

### Requirement: SSE progress SHALL 包含估算百分比

系统 SHALL 在每次 progress SSE event 中附带 `progress_pct` 字段（0-100），表示视频生成进度的估算百分比。

#### Scenario: progress event 携带 progress_pct
- **GIVEN** 视频生成任务正在轮询
- **WHEN** 系统每次 yield progress 时
- **THEN** event 数据中 SHALL 包含整数 `progress_pct` 字段
- **AND** 非终态进度计算规则为 `min(90, int(elapsed / 600 * 90))`（最大 90%）
- **AND** 任务完成时 `progress_pct` 为 100

### Requirement: 轮询间隔 SHALL 动态调整

轮询间隔应根据已等待时间动态调整，在前 30s 频率较高，之后降低以减少 SSE 消息噪音。

#### Scenario: 动态轮询间隔
- **WHEN** 系统正在轮询视频任务
- **THEN** 前 30s 轮询间隔 SHALL 为 5s
- **AND** 超过 30s 后轮询间隔 SHALL 为 10s
