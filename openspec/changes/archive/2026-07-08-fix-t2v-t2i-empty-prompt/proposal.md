## Why

意图识别的 `text_to_image` 和 `text_to_video` 规则没有要求用户提供具体的生成内容描述。当用户输入"我要生成图片"时，LLM 判定为 `text_to_image` 并将"我要生成图片"（或 fallback 到 reply 文案）作为 `generation_prompt` 传递到图片生成页，导致用无效提示词生成图片。用户实际需要的是：先反问用户希望的图片/视频内容描述，再触发跳转。

## What Changes

- **intent_recognition.md.j2**：规则 5（text_to_video）和规则 6（text_to_image）增加约束——仅当用户输入包含具体场景/主题/风格描述时才触发，否则归为 `chat` 并反问用户具体需求
- **test_intent_recognition.py**：新增测试用例覆盖"我要生成图片"判定为 chat（反问）的场景，保留正常描述时识别为 text_to_image 的测试

## Capabilities

### New Capabilities
无

### Modified Capabilities
- `intent-recognition`: text_to_image / text_to_video 的触发条件收紧，要求输入包含具体的生成内容描述

## Impact

- 后端：仅修改 `backend/app/prompt_templates/intent_recognition.md.j2` 的规则描述
- 测试：`backend/tests/test_agents/test_intent_recognition.py` 新增测试用例
- 前端：无改动（ChatBubble 逻辑不变）
- LLM 行为：无描述时不再触发 T2V/T2I，改为 chat 反问
