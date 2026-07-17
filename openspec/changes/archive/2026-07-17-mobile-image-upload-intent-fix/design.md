## Context

移动端聊天页（`frontend/src/pages/mobile-workbench/ScreenChat.tsx`）已支持通过 + 号面板唤起文件上传。上传成功后，前端把图片 URL 通过 `sendMessage(inputValue.trim(), urls)` 发往后端。当前链路存在两个断点：

1. `useChat.ts` 的 `SEND_MESSAGE` 只把 `content` 写入用户消息，`imageUrls` 丢失，导致 `ChatBubble` 没有可渲染的缩略图。
2. 意图识别节点 `intent_recognition_agent.py` 在 `_load_system_prompt` 清理 context 时，只保留了 `brand_input` / `conversation_history` / `market_name`，把 `image_urls` 过滤掉了。因此 prompt 模板里虽然写了“有 image_urls 时优先考虑 text_to_image / generate_video / text_to_video”，但 LLM 实际看不到图片上下文。用户只上传图片、没有文字输入时，message 为空，LLM 大概率返回 `chat`，前端就展示 generic 介绍文案。

## Goals / Non-Goals

**Goals:**
- 用户上传的图片必须在用户自己的消息气泡中显示缩略图。
- 上传图片且没有明确文字指令时，AI 应引导用户进入以图生图（`text_to_image`）流程，而不是 generic chat 介绍。
- 复用已有以图生图/视频的基础设施（`InlineImageCard`、`InlineVideoCard`、DashScope `oss_url`）。

**Non-Goals:**
- 不新增全屏图片查看器。
- 不新增上传后选择“生图/生视频”的独立选择 UI。
- 不改动 API YAML 契约。
- 不涉及方案自动执行、跨平台数据接入等 out_scope 能力。

## Decisions

### 1. 用户消息保存 imageUrls

- 修改 `useChat.ts` 的 `SEND_MESSAGE` action，让它接收可选的 `imageUrls`，并写入 `ChatMessage.imageUrls`。
- `sendMessage` 回调同步转发 `imageUrls`，保持现有调用签名兼容。

### 2. ChatBubble 渲染用户图片缩略图

- 在 `ChatBubble.tsx` 的用户消息区域（`isUser === true`），在文字内容下方渲染 `message.imageUrls`。
- 单图：`<img>` 宽度限制 `max-w-[200px]`，保持 `rounded-lg`，不破坏气泡圆角。
- 多图：垂直堆叠，每张图一行，避免移动端窄屏网格适配问题。
- 样式复用现有 Tailwind 类，不引入新 CSS 文件。

### 3. 意图识别透传 image_urls

- `_load_system_prompt` 的 `clean_ctx` 增加 `image_urls` 透传：
  - 如果 `context.image_urls` 是长度大于 0 的数组，直接透传。
  - 同时兼容旧的 `context.image_url` 单字符串形式（如果存在）。
- prompt 模板 `intent_recognition.md.j2` 已有图片上下文说明，但增加一条兜底规则：当 `message` 为空且 `image_urls` 存在时，默认意图为 `text_to_image`，并给出引导回复。

### 4. 后端兜底纠正

- 在 `_normalize_intent_output` 中，增加一个最终兜底：如果 `output.intent` 是 `chat` 或 `clarify`，且 context 中存在 `image_urls`（需要在 `run_intent_recognition` / `stream_intent_recognition` 把原始 context 传进来），则：
  - 把 intent 改为 `text_to_image`。
  - 设置 `image_url` 为第一张图片 URL。
  - `generation_prompt` 保留用户输入（可能为空）。
  - reply 设为引导文案：
    > “收到图片！您可以描述一下想要的风格/场景，或直接点击「生成图片」开始生成宣传图。”
- 这个兜底是防御性的，主要覆盖 LLM 没按 prompt 规则返回的场景。

### 5. 多轮复用已有图片

- `ScreenChat.tsx` 的 `handleCreateImage` / `handleCreateVideo` 已取最近上传图片 URL 传入 `addVirtualMessage`，保持不变。
- virtual message 的 intent 是前端直接指定的 `text_to_image` / `generate_video`，不受意图识别影响。

## Risks / Trade-offs

- **[Risk]** LLM 在 `image_urls` 存在时仍可能返回 `market_research` 或 `generate_plan`（如果用户输入同时包含分析/方案关键词）。
  - **Mitigation**: prompt 规则明确“有图片时优先图片生成意图”；`_normalize_intent_output` 只对 `chat` / `clarify` 做兜底纠正，不覆盖 `generate_plan` / `market_research`，避免误伤明确的非生成意图。
- **[Risk]** 用户上传多张图时只取第一张作为 `image_url`。
  - **Mitigation**: 当前生成模型只接受单张参考图，与现有行为一致；`ChatMessage.imageUrls` 仍保存全部 URL 用于展示。
- **[Trade-off]** 无文字输入时默认进入 `text_to_image` 而不是弹出选择。
  - 这是最小修复路径；后续如需让用户选择生图/生视频，可在 `text_to_image` 卡片内增加切换按钮。
