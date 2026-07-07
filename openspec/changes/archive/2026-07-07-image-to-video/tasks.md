## 1. 配置层

- [x] 1.1 settings.py 新增 `dashscope_i2v_model` 配置项，默认值 `"happyhorse-1.1-i2v"`
- [x] 1.2 `docs/superpowers.yaml` 将 `video-generation` 加入 in_scope（包含文生视频和图生视频）

## 2. Agent 层重构

- [x] 2.1 `_build_create_body()` 私有函数：根据 `image_url` 参数组装不同 input 结构的请求体
  - 有 image_url → model: dashscope_i2v_model, input: { prompt?, img_url }
  - 无 image_url → model: dashscope_video_model, input: { prompt }
- [x] 2.2 `create_video_task()` 增加 `image_url` 参数，使用 `_build_create_body()` 组装请求
- [x] 2.3 `stream_video_generation()` 增加 `image_url` 参数，透传到 create_video_task

## 3. Router 层

- [x] 3.1 `VideoGenerateRequest` 增加可选 `image_url: str | None` 字段
- [x] 3.2 请求体校验：`image_url` 非空时验证 URL 格式（fastapi 自动校验或 pydantic validator）
- [x] 3.3 `video_generate()` handler 将 `image_url` 透传到 stream_video_generation

## 4. 前端

- [x] 4.1 `VideoTestPage.tsx` 增加可选的图片 URL 输入框
- [x] 4.2 传入 SSE stream 时携带 image_url 参数（如用户已填写）
- [x] 4.3 确保 progress 轮询事件持续渲染"生成中"UI（已有逻辑，验证 I2V 流程正常）

## 5. 测试

- [x] 5.1 为 `_build_create_body()` 编写 T2V 分支单元测试
- [x] 5.2 为 `_build_create_body()` 编写 I2V 分支（含/不含 prompt）单元测试
- [x] 5.3 轮询（`poll_video_task`）复用逻辑不需重复测试

## 6. 验证

- [x] 6.1 启动后端，用 curl 测试 `POST /video/generate` + `image_url` 参数
- [x] 6.2 前端验证：SSE 事件流正常，progress 持续推送不中断
- [x] 6.3 验证文生视频分支不受影响（无 image_url 时走原逻辑）

## 清理

- [x] 更新 Agent 和 Router 文件头的 docstring 反映图生视频支持
- [x] 处理测试通过后的 kill server 和最终验证
