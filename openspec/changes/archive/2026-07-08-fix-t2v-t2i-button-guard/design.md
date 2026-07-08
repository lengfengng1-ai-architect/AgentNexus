## Context

当前 ChatBubble.tsx 中生成类按钮（text_to_image / text_to_video / generate_video）的显示条件只检查 `intent` 值，没有校验实际的生成内容是否存在。handleNavigate 在有 fallback `message.content` 时会误用 LLM 回复文案作为生成提示词。

## Goals / Non-Goals

**Goals:**
- 按钮仅在有效生成描述存在时才显示
- handleNavigate 不 fallback 到 message.content

**Non-Goals:**
- 不修改 LLM prompt 层（已在 `fix-t2v-t2i-empty-prompt` 处理）
- 不修改 intent schema
- 不修改后端

## Decisions

**判断阈值**：generationPrompt / videoPrompt 的有效性用 `length > 3` 判断，过滤掉"空的"或"生成视频"这类无意义的短字符串。
**generate_video**：按钮显示依赖 `imageUrl` 存在（有上传图片才可生成），videoPrompt 可选为空。

## Risks / Trade-offs

- [低] 如果用户恰好输入 3 个字符的有意义描述→理论上会被挡住，但如果 input length > 3 不成立，说明用户确实没给有效描述
