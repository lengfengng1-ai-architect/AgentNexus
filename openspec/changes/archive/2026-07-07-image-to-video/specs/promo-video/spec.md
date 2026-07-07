## ADDED Requirements

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
