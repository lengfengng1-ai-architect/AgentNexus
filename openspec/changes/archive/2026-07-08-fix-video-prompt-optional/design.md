## Context

视频生成端点 `POST /api/v1/video/generate` 当前 `prompt` 为必填字段。实际使用中存在三种场景——文生视频（仅 prompt）、图生视频（仅 image_url）、图+文生成视频（prompt + image_url）。需要将 prompt 改为可选，同时确保至少有一个输入。

## Goals / Non-Goals

**Goals:**
- prompt 改为可选，支持纯图生视频
- 前端按钮守卫适配纯图片场景
- 自触发逻辑适配无 prompt 的纯图跳转

**Non-Goals:**
- 不改变 I2V 和 T2V 的模型选择逻辑
- 不改变图片生成（T2I）逻辑

## Decisions

- **后端校验**：在 Pydantic model 中添加 `@model_validator`，要求 `prompt` 和 `image_url` 至少一个非空
- **前端按钮**：`hasValidPrompt` 已检查 `imageUrl`，只需修改按钮自身 `disabled` 条件
- **自触发**：`?image_url=xxx` 不带 prompt 时也应启动生成
- **T2V 适配**：`_build_create_body` 中 T2V 分支在 prompt 为 None/空时也应能构建请求（实际 DashScope T2V 要求 prompt 非空，但纯图场景走 I2V 分支，不受影响）

## Risks / Trade-offs

- [低] prompt 为空 + image_url 也传空 → 后端 422，前端已防止此情况
