## Why

用户输入"我要生成宣传片""我要生成宣传图"时，意图识别 LLM 将其归为 chat 意图并以对话形式追问品牌信息，而不是展示带可选参数的制图/制视频的参数卡片。需要修复意图识别规则，让 text_to_video / text_to_image 意图即使没有具体内容描述也能触发前端参数卡片。

## What Changes

1. **意图识别 prompt 模板** — 规则 5 `text_to_video`、规则 6 `text_to_image` 去掉"无具体描述归为 chat"的限制，改为直接降级为对应意图并回复引导文字
2. **InlineImageCard** — 增加图片描述输入框和尺寸选择按钮，prompt 为空时仍渲染参数卡供用户填写
3. **ChatBubble** — 去掉 `generationPrompt.length > 3` 硬性限制，`text_to_image` 意图立即渲染 InlineImageCard

## Capabilities

### Modified Capabilities
- `chat-input-plus-menu`: 意图识别规则变更，text_to_video/text_to_image 不再因缺描述降级为 chat

## Impact

- `backend/app/prompt_templates/intent_recognition.md.j2` — LLM 意图判断规则修改
- `frontend/src/components/InlineImageCard.tsx` — 增加参数选择 UI
- `frontend/src/components/ChatBubble.tsx` — 渲染条件放宽
