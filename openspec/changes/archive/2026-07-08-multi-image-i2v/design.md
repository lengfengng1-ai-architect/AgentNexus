## Context

当前图生视频（I2V）全链路使用单值 `image_url: str | None`。HappyHorse I2V 的 `media` 字段本是数组类型，支持最多 9 张图片作为参考帧。需要将单图输入改为多图输入，同时保持后向兼容。

## Data Flow

```
对话跳转: ChatMessage.imageUrls[] → URL query ?image_urls=a,b,c
                               ↘ 手动输入: 前端 textarea（按行分隔）→ 缩略图预览

前端: 多行 textarea → 按行分割为 string[] → VideoParams.image_urls
     ↘ 自触发: parse ?image_urls 为 string[]

后端: VideoGenerateRequest.image_urls → _build_create_body media = [{url: img1}, {url: img2}, ...]
     ↘ model_validator: image_urls 与 prompt 至少提供一个
     ↘ max_length: 最多 9 张

DashScope API media 结构:
  "media": [
    {"type": "first_frame", "url": "https://img1"},
    {"type": "first_frame", "url": "https://img2"}
  ]
```

## Goals / Non-Goals

**Goals:**
- 全链路支持 1~9 张图片 URL 输入
- 前端动态渲染缩略图预览
- 对话跳转支持多 URL 传递
- 后端兼容单 URL 场景（仅传 1 张时行为不变）

**Non-Goals:**
- 不涉及图片上传功能（仍是 URL 方式）
- 不修改 T2V（文生视频）逻辑
- 不修改 T2I（文生图）逻辑
- 不做图片裁剪/压缩等预处理

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **后端字段 `image_urls: list[str]`** | 与现有命名体系一致；明确表示多值；DashScope API media 字段接收数组 |
| 2 | **前端用多行 textarea（按行分隔）** | 批量粘贴场景最自然（用户从图床复制多个 URL，每行一个），比逗号分隔更直观 |
| 3 | **URL query param 用逗号分隔 `?image_urls=u1,u2,u3`** | 简洁、URL 友好、前后端解析成本低（`split(',')`） |
| 4 | **缩略图用原生 `<img>` 加载** | 不引入第三方图片 CDN/库，足够满足 MVP 需要 |
| 5 | **`@model_validator` + 字段级 `max_length`** | 校验 1~9 张图片；至少提供一个 prompt 或图片 |

## Risks / Trade-offs

- **[低] 缩略图加载失败** → 显示 fallback 占位符（"加载失败"文字），不阻塞生成
- **[低] URL 中本身含逗号** → query param 传递时需提示用户避免逗号，或前端做 URL encoding
- **[低] 大量图片增加生成耗时** → HappyHorse 按帧数计费，前端提示"张数越多生成越慢"
