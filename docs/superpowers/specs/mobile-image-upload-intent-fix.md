# 移动端图片上传后缩略图 + 意图识别修正设计稿

## 背景

移动端聊天页已支持 + 号面板上传图片，但存在两个问题：
1. 用户上传图片后，用户发送的消息气泡中没有显示图片缩略图。
2. 意图识别在用户上传图片后，返回的是 generic chat 介绍，而不是引导用户进行以图生图 / 以图生视频的多轮生成流程。

## 设计决策

### 1. 用户消息气泡缩略图

- 单图：宽度限制在消息气泡内（最大 200px），保持气泡原有圆角（移动端为 `14px 14px 4px 14px`）。
- 多图：垂直堆叠，每张图单独一行，避免复杂网格在窄屏下的适配问题。
- 点击放大：本次不新增全屏查看，保持最小改动；后续如有需要可再补充。
- 实现位置：`frontend/src/components/ChatBubble.tsx` 在用户消息（`isUser === true`）中渲染 `message.imageUrls`。

### 2. 意图识别修正

- 后端 `_load_system_prompt` 目前清理 context 时只保留 `brand_input` / `conversation_history` / `market_name`，**未保留 `image_urls`**，导致 prompt 里的图片上下文丢失。需要把 `image_urls` 透传进去。
- `_normalize_intent_output` 中 `text_to_image` / `generate_video` / `text_to_video` 已在 `INDEPENDENT` 列表，不应被 brand_input 缺失覆盖。主要修复点是 context 透传。
- 当用户上传图片且文字输入为空时：
  - 如果 LLM 返回 `text_to_image` / `generate_video` / `text_to_video`：正常进入对应生成流程。
  - 如果 LLM 返回 `chat` 或 `clarify`：
    - 由于 `context.image_urls` 存在，强制纠正为 `text_to_image`（以图生图），并给出一个引导性 reply：
      > “收到图片！您可以描述一下想要的风格/场景，或直接生成宣传图。也可以切换为视频生成。”
    - 同时把 `image_url` 设为第一张图片 URL，`generation_prompt` 可留空或复用用户输入。

### 3. + 号面板复用最近图片

- `ScreenChat.tsx` 中 `handleCreateImage` / `handleCreateVideo` 已自动取最近上传图片 URL 传入 virtual message，保持不变。
- 需要确保意图识别不会把 virtual message 的意图覆盖。

## OpenSpec 变更范围

- 新增 change：`mobile-image-upload-intent-fix`
- 涉及文件：
  - `frontend/src/hooks/useChat.ts`：SEND_MESSAGE 保存 imageUrls。
  - `frontend/src/components/ChatBubble.tsx`：用户消息渲染 imageUrls 缩略图。
  - `backend/app/agents/intent_recognition_agent.py`：context 透传 image_urls，无文字时兜底为 text_to_image。
- 不修改 API YAML（字段已存在）。
