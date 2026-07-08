## 1. 后端 — VideoGenerateRequest prompt 可选

- [x] 1.1 `routers/video.py` — `VideoGenerateRequest.prompt` 改为 `str | None = None`，新增 `@model_validator` 校验 prompt 或 image_url 至少一个
- [x] 1.2 `video_generation_agent.py` — `_build_create_body` 适配 prompt 为 None 的情况（T2V 分支跳过 prompt）
- [x] 1.3 `docs/api/paths/video.yaml` — 新建 OpenAPI YAML

## 2. 前端 — 按钮守卫 + 自触发适配

- [x] 2.1 `VideoTestPage.tsx` — 按钮 `disabled` 条件改为 `!prompt.trim() && !imageUrl.trim()`
- [x] 2.2 `VideoTestPage.tsx` — `handleGenerate` 的 `if (!trimmedPrompt) return` 改为 `if (!hasPrompt && !hasImage) return`
- [x] 2.3 `VideoTestPage.tsx` — 自触发 `useEffect` 条件改为 `if (qPrompt || qImageUrl)`，API 调用适配无 prompt 情况

## 3. 同步主 spec

- [x] 3.1 同步 `openspec/specs/video-generation/spec.md` 新增纯图生视频场景
