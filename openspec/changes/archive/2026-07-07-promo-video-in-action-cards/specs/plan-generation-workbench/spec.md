# Capability: plan-generation-workbench — Delta Spec

## MODIFIED Requirements

### Requirement: `/plan` 右侧 SHALL 展示 Agent 流水线可视化和行动建议

`/plan` 右侧 SHALL 以垂直时间线形式展示 `plan_generation_pipeline` 的 Agent 执行状态，并展示行动建议卡片。流水线运行时 SHALL 自动执行到审核点前停下，无需前端主动 pause。

## ADDED Requirements

### Requirement: 行动建议列表第一个位置 SHALL 展示宣传视频

当 `outputs.promo_video.status` 存在时，"下一步行动建议"卡片列表的第一个位置 SHALL 展示宣传视频卡片，其余建议顺延。

#### Scenario: 视频生成中显示"视频生成中"状态
- **GIVEN** 方案流水线已完成
- **WHEN** `outputs.promo_video.status === "generating"`
- **THEN** 行动建议列表第一张卡片 SHALL 显示"宣传视频生成中…"和脉冲动画
- **AND** 其余行动建议卡片正常显示

#### Scenario: 视频生成完成显示视频播放器
- **GIVEN** 视频后台任务完成
- **WHEN** `outputs.promo_video.status === "completed"`
- **THEN** 行动建议列表第一张卡片 SHALL 渲染为 `<video controls autoPlay>` 播放器
- **AND** 卡片背景 SHALL 为深色以适配视频播放

#### Scenario: 视频生成失败降级显示
- **WHEN** `outputs.promo_video.status === "failed"`
- **THEN** 行动建议列表第一张卡片 SHALL 显示"视频生成失败"提示
- **AND** 其余行动建议卡片正常显示
