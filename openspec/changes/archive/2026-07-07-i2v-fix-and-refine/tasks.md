## 1. 后端 — progress_pct 动态分母

- [x] 1.1 新增 `_estimate_max_poll_seconds(duration: int) -> int` 函数，公式 `max(180, min(600, 120 + duration * 40))`
- [x] 1.2 `stream_video_generation()` 接收 `duration` 参数，调用 `_estimate_max_poll_seconds` 替换 `MAX_POLL_SECONDS` 作为 progress_pct 分母

## 2. 前端 — I2V 页面重构

- [x] 2.1 image_url 输入从下方移到上方作为主输入，prompt 改为可选（下方，加"可选"标记）
- [x] 2.2 按钮 disabled 条件改为 `!imageUrl.trim()`
- [x] 2.3 导航标签"文生视频"改为"图生视频"（`App.tsx`）

## 3. 测试

- [x] 3.1 新增 `_estimate_max_poll_seconds` 的单元测试
- [x] 3.2 后端现有测试中的 `progress_pct` 断言适配动态分母

## 4. 文档

- [x] 4.1 更新 `openspec/specs/video-generation/spec.md` 主 spec 同步 delta spec
