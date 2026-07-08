## Why

当前图生视频使用 HappyHorse I2V 模型（`happyhorse-1.1-i2v`），其 `media` 数组只允许 1 张 `first_frame` 图片。当用户传入多张图片（最多 9 张）时，API 返回 "Multiple first_frame items are not allowed" 错误。HappyHorse R2V 模型（`happyhorse-1.1-r2v`）支持 1～9 张 `reference_image`,且功能定位与 I2V 基本一致，可无缝替换。

## What Changes

- `_build_create_body()` 中 `model` 从 `settings.dashscope_i2v_model` 改为新配置项 `settings.dashscope_r2v_model`
- `media[].type` 值从 `"first_frame"` 改为 `"reference_image"`
- 新增 `DASHSCOPE_R2V_MODEL` 配置项（环境变量），默认 `happyhorse-1.1-r2v`
- 删除 `DASHSCOPE_I2V_MODEL` 配置（不再使用）
- 同步更新 `docs/api/paths/video.yaml` 中描述

## Capabilities

### New Capabilities

无（功能等价替换，无新增 capability）

### Modified Capabilities

- `video-generation`: 图生视频模型从 I2V 切换为 R2V，`media.type` 改为 `reference_image`，支持 1-9 张图片

## Impact

| 影响范围 | 具体内容 |
|---------|---------|
| Agent | `video_generation_agent.py` `_build_create_body()` 修改 model 和 media.type |
| 配置 | `config/settings.py` 删除 `dashscope_i2v_model`、新增 `dashscope_r2v_model` |
| API 文档 | `docs/api/paths/video.yaml` 更新描述 |
| 测试 | `test_video_generation_agent.py` 中 I2V 相关测试改为 R2V 参数 |
