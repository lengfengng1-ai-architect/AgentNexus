## Why

当前视频生成页面有两个问题：
1. **进度百分比不准**：`progress_pct` 分母固定 600s，但 1.5s 视频实际只需 2-3 分钟，进度条跑得太慢，用户无法感知真实进度。
2. **页面定位不对**：VideoTestPage 是 T2V（文生视频）为主的设计，prompt 是必填，image_url 是可选。但实际需求是纯 I2V（图生视频），image_url 是核心输入，prompt 只是可选辅助。

## What Changes

- **后端**：`progress_pct` 计算公式改为 `_estimate_max_poll_seconds(duration)` 动态计算，公式为 `clamp(120 + duration × 40, 180, 600)`
- **前端**：VideoTestPage 改为纯 I2V 页面——image_url 是必填主输入（放到页面上方），prompt 改为可选（放到下方作为辅助文案），按钮 disabled 条件从 `!prompt.trim()` 改为 `!imageUrl.trim()`
- **前端**：导航标签"文生视频"改为"图生视频"

## Capabilities

### New Capabilities
无

### Modified Capabilities
- `video-generation`: progress_pct 估算改为动态公式；图生视频前端页面专属化

## Impact

| 影响范围 | 具体内容 |
|---------|---------|
| 后端 | `stream_video_generation()` 内 `progress_pct` 公式需新增参数或常量 |
| 前端 | `VideoTestPage.tsx` 布局重排，`App.tsx` 导航改标签 |
| 测试 | 后端测试需更新 `progress_pct` 断言 |
| spec | `video-generation/spec.md` 补充动态公式需求 |
