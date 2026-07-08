## Context

当前意图识别系统支持 6 种意图，其中 `generate_video` 用于图生视频。用户希望对话也能识别文生视频（文本→视频）和文生图（文本→图片），并在识别后将生成类意图统一导航到测试页自触发，而非内嵌气泡。

后端 `/video/generate` 已支持 T2V（空 `image_url`）和 I2V（带 `image_url`），`/image/generate` 已支持文生图。仅缺意图识别层和前端导航。

## Goals / Non-Goals

**Goals:**
- 新增 `text_to_video` 和 `text_to_image` 两个意图
- 统一生成类意图的交互模式：聊天气泡显示导航按钮 → 跳转测试页 → 自动触发生成
- `generate_video` 从内嵌气泡改为导航按钮模式

**Non-Goals:**
- 不新增后端 API 端点（复用现有 `/video/generate` 和 `/image/generate`）
- 不改变后端视频/图片生成 Agent 逻辑

## Decisions

**1. 区分 text_to_video 和 generate_video**
- `text_to_video`：用户仅输入文字"生成一段海滩视频"——无图片附件，跳转 VideoTestPage 自动填入 prompt 触发（image_url 为空，走 T2V）
- `generate_video`：用户已上传图片——跳转 VideoTestPage 自动填入 prompt + image_url（走 I2V）

**2. 新增 generation_prompt 字段而不是复用 video_prompt**
- 需统一提取用户输入的生成描述，不受具体类型限制
- `generation_prompt` 对 T2V、I2V、T2I 都适用
- `video_prompt` 字段保留用于 generate_video 的上下文

**3. test page 通过 URL query param 自触发**
- 使用 ?prompt=xxx&image_url=xxx 传参
- pages 在 mount 时检查 query params，有值则自动开始生成
- 不引入 router 库，使用 URLSearchParams

## Risks / Trade-offs

- **url query param 长度限制**：prompt 较长时可能被截断 → 使用 encodeURIComponent，最长 2500 字（与 VideoGenerateRequest 一致）
- **test page 同时被手动访问**：用户直接打开测试页手动填写时，query params 为空 → 不影响，走现有手动交互模式
