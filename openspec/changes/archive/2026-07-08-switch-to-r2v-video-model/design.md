## Context

当前 `_build_create_body()` 在 `image_urls` 非空时使用 `happyhorse-1.1-i2v` 模型，`media.type: "first_frame"`，但 I2V API 只允许 1 张图片。当用户传入 2-9 张图片时（UI 已支持），API 返回错误。HappyHorse R2V `happyhorse-1.1-r2v` 支持 1-9 张 `reference_image`，API 格式与 I2V 高度一致，可快速替换。

## Goals / Non-Goals

**Goals:**
- 将图生视频模型从 I2V 切换为 R2V
- 支持 1-9 张图片输入
- 原 I2V 配置（`DASHSCOPE_I2V_MODEL`）删除，新增 `DASHSCOPE_R2V_MODEL`

**Non-Goals:**
- 不改前端 UI（当前多图片输入交互不变）
- 不改 T2V 文生视频逻辑
- 不评估 R2V vs I2V 效果差异（由业务验收）

## Decisions

### Decision 1: 删除 I2V 配置而非保留作为 fallback

选择直接删除 `DASHSCOPE_I2V_MODEL` 并替换为 `DASHSCOPE_R2V_MODEL`，因为 I2V 模型对多图场景全部失效，保留无意义。

### Decision 2: 统一用 R2V 处理全部图片场景

R2V 支持 1-9 张 `reference_image`，单图场景也走 R2V 而非 I2V。简化逻辑，无需在 _build_create_body 中根据图片数量做分支。

## Risks / Trade-offs

- [低风险] R2V 默认模型名与当前 `happyhorse-1.1-i2v` 不同，需确认 R2V 模型已上架可用
- [低风险] R2V 单图效果与 I2V 可能有差异，需业务验收
