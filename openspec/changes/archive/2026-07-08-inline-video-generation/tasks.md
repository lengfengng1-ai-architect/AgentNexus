## 1. 类型定义

- [x] 1.1 ChatMessage 类型新增 `videoResult` 可选字段
- [x] 1.2 ChatBubble 和 ChatContainer props 清理（移除导航相关 props）

## 2. ChatInput 📎 附件栏

- [x] 2.1 ChatInput 新增 📎 toggle 按钮 + urlRows 状态
- [x] 2.2 实现 urlRows 行级输入（自动追加空行、删除、批量粘贴拆分）
- [x] 2.3 实现 URL 缩略图预览（加载中/成功/失败状态）
- [x] 2.4 发送消息时携带 image_urls 到 streamChat，发送后自动收起附件栏

## 3. InlineVideoCard 组件

- [x] 3.1 创建 InlineVideoCard 组件骨架（props: prompt, imageUrls 等）
- [x] 3.2 实现参数面板（resolution/ratio/duration/seed），默认折叠
- [x] 3.3 实现 [生成视频] 按钮 + SSE `streamVideoGeneration()` 调用
- [x] 3.4 实现进度条 + 状态行（进度百分比 + 已等待时间）
- [x] 3.5 实现生成完成 → 视频播放器（内联播放/暂停）
- [x] 3.6 实现全屏弹窗 overlay
- [x] 3.7 实现错误处理 + 重试
- [x] 3.8 AbortController 取消进行中的 SSE 请求（组件卸载时）

## 4. ChatBubble 集成

- [x] 4.1 ChatBubble 接收 video intent 时渲染 InlineVideoCard 替代跳转按钮
- [x] 4.2 移除 ChatBubble 中的跳转导航 props 和逻辑

## 5. ChatContainer 清理

- [x] 5.1 移除 ChatContainer 中 `handleNavigateVideo`/`handleNavigateImage`
- [x] 5.2 清理相关 props 透传

## 6. 收尾

- [x] 6.1 验证全部 5 种场景：文生图、图生视频、普通对话、视频播放持久化、失败/错误
- [x] 6.2 前端编译无报错
