## 1. 类型与 hooks

- [x] 1.1 ChatMessage 类型新增 `imageResult` 字段
- [x] 1.2 useChat 新增 `IMAGE_RESULT` action + `updateImageResult`

## 2. InlineImageCard 组件

- [x] 2.1 创建 InlineImageCard 组件（props: prompt, messageId）
- [x] 2.2 实现 Prompt 预览 + [生成图片] 按钮
- [x] 2.3 实现 POST 调用 `/api/v1/image/generate` + 加载状态
- [x] 2.4 实现完成 → 图片展示 + 全屏弹窗
- [x] 2.5 实现错误处理 + 重试
- [x] 2.6 结果回写 ChatMessage.imageResult

## 3. ChatBubble 集成

- [x] 3.1 ChatBubble text_to_image 时渲染 InlineImageCard

## 4. ChatContainer 透传

- [x] 4.1 ChatContainer 透传 onImageResult

## 5. 收尾

- [x] 5.1 前端编译无报错
- [x] 5.2 测试通过
