## 1. 后端 — schema 和字段适配

- [x] 1.1 `routers/video.py` — `VideoGenerateRequest.image_url` 改为 `image_urls: list[str] = Field(default=[])`，添加 `@field_validator` 校验 1~9 张
- [x] 1.2 `video_generation_agent.py` — `_build_create_body` 中 `media` 从单元素改为遍历 `image_urls` 构建多帧
- [x] 1.3 `video_generation_agent.py` — `create_video_task` / `stream_video_generation` 签名改为 `image_urls: list[str] | None`
- [x] 1.4 `docs/api/paths/video.yaml` — 更新 schema 定义：`image_url` → `image_urls`

## 2. 前端 — 多图输入 + 缩略图预览

- [x] 2.1 `VideoTestPage.tsx` — 图片输入从单行 input 改为多行 textarea（按行分割），状态从 `imageUrl: string` 改为 `imageUrls: string[]`
- [x] 2.2 `VideoTestPage.tsx` — 动态渲染缩略图 grid（`urls.map` → `<img>`），加载失败显示占位符
- [x] 2.3 `VideoTestPage.tsx` — 按钮守卫改为 `imageUrls.length > 0 || prompt.trim().length > 0`
- [x] 2.4 `VideoTestPage.tsx` — handleGenerate 使用 `imageUrls` 数组
- [x] 2.5 `VideoTestPage.tsx` — 自触发 useEffect 解析逗号分隔 `?image_urls=u1,u2` → `string[]`

## 3. 共享类型 + 导航传递

- [x] 3.1 `types/video.ts` — `VideoParams.image_url` 改为 `image_urls?: string[]`
- [x] 3.2 `types/chat.ts` — `ChatMessage.imageUrl` 改为 `imageUrls?: string[]`
- [x] 3.3 `ChatBubble.tsx` / `ChatContainer.tsx` — 导航参数改为数组编码到逗号分隔字符串

## 4. 同步主 spec

- [x] 4.1 同步 `openspec/specs/video-generation/spec.md` 新增多图生视频场景
