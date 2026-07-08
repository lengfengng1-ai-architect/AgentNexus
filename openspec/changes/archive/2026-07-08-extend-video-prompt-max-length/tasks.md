## 1. 后端 Pydantic Schema 修改

- [x] 1.1 `backend/app/routers/video.py` 中 `VideoGenerateRequest.prompt` 的 `max_length` 从 2500 改为 10000

## 2. API 文档同步

- [x] 2.1 `docs/api/paths/video.yaml` 中 `prompt.maxLength` 从 2500 改为 10000

## 3. 验证

- [x] 3.1 启动后端，用 curl 请求 prompt 超过 2500 字符的 body，确认返回 200 而非 422
- [x] 3.2 确认现有视频生成测试通过
