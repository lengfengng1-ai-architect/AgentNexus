## Context

`POST /api/v1/video/generate` 接收 VideoGenerateRequest，其中 `prompt` 字段当前限制 `max_length=2500`。用户编写详细视频 prompt（分镜描述、美术风格、镜头语言等）容易超出。

## Goals / Non-Goals

**Goals:**
- `prompt` 字段 `max_length` 从 2500 放宽到 10000
- 同步更新 OpenAPI YAML 中 `prompt.maxLength`

**Non-Goals:**
- 不改前端 UI（后续可加字符计数器，但在本 change 范围外）
- 不改模型端 token 截断行为（HappyHorse 自身处理超长输入）
- 不做 prompt 分块发送

## Decisions

### Decision 1: 放宽到 10000 而不是 5000

选择 10000 而非 5000，因为实际使用中详细广告文案（镜头拆解、灯光/色彩描述、品牌视觉指导）很容易超过 3000 字符，5000 仍可能踩线。HappyHorse API 无文档提及 prompt 长度限制，且 10000 字符远低于 RESTful 请求体合理上限。

### Decision 2: 不改前端

前端 prompt 输入用 `<textarea>`，无字数限制，无需修改。本 change 纯后端数值改动。

## Risks / Trade-offs

- [低风险] 后端请求体尺寸微增，但 10000 字符对 JSON body 影响可忽略
- [低风险] 模型层若截断，超出模型上限的 prompt 内容会被截断，但不影响 API 可用性
