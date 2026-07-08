## Why

对话聊天目前只支持 `generate_video`（图生视频）意图识别，用户无法通过自然语言触发文生视频和文生图操作。需要新增 `text_to_video` 和 `text_to_image` 两个意图，并在识别后跳转到对应的测试页自动生成，同时将现有的 `generate_video` 从内嵌气泡改为跳转测试页，保持交互一致性。

## What Changes

- `IntentRecognitionOutput.intent` 枚举增加 `text_to_video | text_to_image`
- `IntentRecognitionOutput` 新增 `generation_prompt: str | None` 字段（统一的生成描述提取字段）
- Prompt 模板增加 T2V/T2I 判断规则
- 前端 `IntentResult` 和 `ChatMessage` intent union 增加 `text_to_video | text_to_image`
- `ChatBubble` 对生成类意图显示导航按钮（跳转测试页），移除 `generate_video` 的内嵌 VideoBubble
- `ChatContainer` 处理导航按钮点击，带 prompt/image_url 跳转
- `ImageTestPage` / `VideoTestPage` 读取 query params 自动触发生成
- `App.tsx` 导航 label 更新

## Capabilities

### New Capabilities
- （无新 capability，均为对已有能力的修改）

### Modified Capabilities
- `workflow-orchestration`（intent-recognition）：intent 枚举扩展，prompt 模板新增 T2V/T2I 判断规则
- `video-generation`：`generate_video` 前端交互从内嵌气泡改为跳转测试页

## Impact

- `backend/app/schemas/intent.py` — intent pattern + generation_prompt 字段
- `backend/app/agents/intent_recognition_agent.py` — normalize 逻辑
- `backend/app/prompt_templates/intent_recognition.md.j2` — 判断规则
- `frontend/src/api/workflow.ts` — IntentResult 类型
- `frontend/src/types/chat.ts` — ChatMessage 类型 + 视频状态简化
- `frontend/src/components/ChatBubble.tsx` — 导航按钮代替 VideoBubble
- `frontend/src/components/ChatContainer.tsx` — 导航处理
- `frontend/src/hooks/useChat.ts` — generate_video 处理简化
- `frontend/src/pages/VideoTestPage.tsx` — query param 自动触发
- `frontend/src/pages/ImageTestPage.tsx` — query param 自动触发
- `frontend/src/App.tsx` — 导航 label 更新
- `backend/tests/test_agents/test_intent_recognition.py` — 测试用例
