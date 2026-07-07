# Capability: promo-video

## Purpose

在营销方案流水线的 action_recommendations 节点完成后，根据策略输出（品牌名、品类、定位、营销目标）异步生成一条 16:9、720P、5s 的宣传视频，最终展示在"下一步行动建议"列表的第一个位置。

## Requirements

### Requirement: 系统 SHALL 在 action_recommendations 完成后异步触发视频生成

流水线执行到 action_recommendations 节点并产出行动建议后，系统 SHALL 在不阻塞后续流水线的前提下，异步创建视频生成任务。

#### Scenario: action_recommendations 完成后触发视频
- **GIVEN** action_recommendations 节点执行成功，返回完整的 `ActionRecommendationsOutput`
- **WHEN** 该 handler 返回后
- **THEN** 系统 SHALL 读取 `state.brand_input` 中的品牌名和品类、`state.strategy_generation` 中的定位和营销目标，拼接 prompt
- **AND** 系统 SHALL 以 `asyncio.create_task` 方式后台调用 `create_video_task`
- **AND** 系统 SHALL 不阻塞后续 plan_generator 节点的执行

### Requirement: 视频 SHALL 通过内存缓存传递到前端

视频生成是异步过程，最终结果 SHALL 通过 `get_status()` 端点返回给前端。

#### Scenario: 视频生成中时状态上报
- **WHEN** 前端调用 `GET /plan/runs/{run_id}/status`
- **AND** 视频后台任务仍在轮询中
- **THEN** 返回的 outputs 中 SHALL 包含 `promo_video: {status: "generating"}`

#### Scenario: 视频生成完成时返回 URL
- **GIVEN** 视频后台任务已完成（`SUCCEEDED`）
- **WHEN** 前端调用 `GET /plan/runs/{run_id}/status`
- **THEN** 返回的 outputs 中 SHALL 包含 `promo_video: {status: "completed", video_url: "https://..."}`

#### Scenario: 视频生成失败时返回错误
- **GIVEN** 视频后台任务失败（`FAILED`）
- **WHEN** 前端调用 `GET /plan/runs/{run_id}/status`
- **THEN** 返回的 outputs 中 SHALL 包含 `promo_video: {status: "failed", error: "..."}`

### Requirement: 视频规格 SHALL 为 16:9、720P、5s

宣传视频的生成参数 SHALL 固定为：宽高比 16:9、分辨率 720P、时长 5 秒。

#### Scenario: 固定规格生成
- **WHEN** 系统调用 `create_video_task`
- **THEN** 参数 SHALL 为 `ratio: "16:9"`、`resolution: "720P"`、`duration: 5`

### Requirement: 流水线 SHALL 支持图生视频路径

当 action_recommendations 产出中包含图片素材 URL 时，promo-video 节点 SHALL 支持使用该图片作为 I2V 输入生成宣传视频。

#### Scenario: 有图片素材时走 I2V
- **GIVEN** action_recommendations 输出中包含 `image_url` 字段
- **WHEN** 系统触发后台视频生成
- **THEN** 系统 SHALL 将图片 URL 作为 `image_url` 参数传入 `POST /video/generate`
- **AND** 参数中 ratio 保持 16:9、resolution 保持 720P、duration 保持 5s

#### Scenario: 无图片素材时走 T2V
- **GIVEN** action_recommendations 输出中不包含 `image_url` 字段
- **WHEN** 系统触发后台视频生成
- **THEN** 系统 SHALL 走现有 T2V 路径（prompt 拼接品牌名/品类/定位/营销目标）
