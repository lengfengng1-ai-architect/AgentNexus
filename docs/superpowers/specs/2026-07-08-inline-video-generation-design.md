# Inline Video Generation — 对话内嵌视频生成设计

## Background

当前视频生成流程依赖独立 VideoTestPage：对话识别到视频意图后显示跳转按钮，点击跳到 `/video-test` 页面。测试节点即将取消，所有视频生成功能需融合进对话中。

## Goals

- ChatInput 支持图片 URL 附件（📎 按钮展开行级输入）
- ChatBubble 直接渲染视频生成卡片，不跳转页面
- 卡片自包含：参数选择 → 生成 → 进度条 → 视频播放 → 全屏
- 结果写入 message 历史，刷新不丢失

## Non-Goals

- 不改变后端 SSE 流式接口
- 不改变 intent 识别逻辑
- 不重构 ChatReducer

## Architecture

```
ChatInput (📎 附件栏)
    │ 发送时携带 image_urls
    ▼
ChatBubble (收到 video intent)
    ▼ 渲染
InlineVideoCard (自包含状态)
    ├── 图片编辑
    ├── 参数面板（折叠）
    ├── 生成按钮 + SSE 流
    ├── 进度条 + 日志
    └── 视频播放器 + 全屏
```

### 组件树

| 组件 | 职责 |
|---|---|
| `ChatInput` | 新增 📎 toggle + urlRows 行级 URL 输入 |
| `ChatBubble` | 移除跳转导航，改为渲染 InlineVideoCard |
| `InlineVideoCard` | 视频完整生命周期（参数→生成→播放） |
| `VideoPlayer` | 内联播放 + 全屏弹窗 |

### 数据流

```
用户输入 + image_urls
  → streamChat → INTENT_RECEIVED { intent: generate_video, image_urls, video_prompt }
    → ChatBubble 渲染 InlineVideoCard(props)
      → 用户点击 [生成视频]
        → streamVideoGeneration(params)
          → progress → 进度条
          → result → 播放器 + 回写 ChatMessage.videoResult
          → error → 错误提示
```

### 数据类型变更

```typescript
// ChatMessage 新增
videoResult?: {
  task_id: string
  video_url: string
  usage?: { resolution?: number; ratio?: string; output_video_duration?: number }
}
```

## Decision Log

| # | Decision | Rationale |
|---|---|---|
| 1 | InlineVideoCard 自包含状态 | 视频生成是 SSE 长连接，存 reducer 无意义；组件隔离方便迭代 |
| 2 | 📎 按钮式附件栏 | 不占常驻空间，需要时展开 |
| 3 | 参数面板默认折叠 | 默认值即可工作，需要时展开调整 |
| 4 | videoResult 回写 ChatMessage | 刷新页面后播放器不丢失 |
| 5 | 全屏用弹窗 | 不离开对话上下文 |
