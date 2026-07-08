## Why

当前 `POST /api/v1/video/generate` 的 `prompt` 字段 `max_length=2500`，但用户生成的详细广告文案（如分镜头描述、美术风格说明）容易超出限制，导致 422 校验失败。需要提高上限，以支持高质量视频 prompt 的完整传递。

## What Changes

- `VideoGenerateRequest.prompt` 的 `max_length` 从 2500 提高到 10000
- 对应 OpenAPI YAML 同步更新 `prompt.maxLength` 约束

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `video-generation`: `prompt` 字段 `max_length` 限制放宽

## Impact

| 影响范围 | 具体内容 |
|---------|---------|
| 后端 Pydantic schema | `backend/app/routers/video.py` 中 `prompt` 的 `max_length` 从 2500 改为 10000 |
| API 文档 | `docs/api/paths/video.yaml` 中 `prompt.maxLength` 从 2500 改为 10000 |
