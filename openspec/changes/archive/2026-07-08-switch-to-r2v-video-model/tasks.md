## 1. 后端配置更新

- [x] 1.1 `backend/app/config/settings.py` 中删除 `dashscope_i2v_model`、新增 `dashscope_r2v_model` 字段（默认 `happyhorse-1.1-r2v`）

## 2. Agent 实现修改

- [x] 2.1 `backend/app/agents/video_generation_agent.py` `_build_create_body()` 中 `model` 从 `settings.dashscope_i2v_model` 改为 `settings.dashscope_r2v_model`
- [x] 2.2 `_build_create_body()` 中 `media[].type` 从 `"first_frame"` 改为 `"reference_image"`

## 3. API 文档同步

- [x] 3.1 `docs/api/paths/video.yaml` 中 `image_urls` 的 description 更新为指向 HappyHorse R2V 而非 I2V

## 4. 测试更新

- [x] 4.1 `backend/tests/test_agents/test_video_generation_agent.py` 中 I2V 相关测试断言改为 R2V 参数（模型名、`reference_image`）
