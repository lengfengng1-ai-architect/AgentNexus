## 1. 意图识别 Prompt 调整

- [x] 1.1 修改 `intent_recognition.md.j2` — 规则 5 text_to_video 去掉"无描述归为 chat"限制
- [x] 1.2 修改 `intent_recognition.md.j2` — 规则 6 text_to_image 去掉"无描述归为 chat"限制

## 2. 前端卡片渲染条件放宽

- [x] 2.1 修改 `ChatBubble.tsx` — 去掉 `generationPrompt.length > 3` 硬性限制

## 3. InlineImageCard 参数选择 UI

- [x] 3.1 修改 `InlineImageCard.tsx` — 增加图片描述输入框（textarea）
- [x] 3.2 修改 `InlineImageCard.tsx` — 增加尺寸选择按钮（1:1/16:9/9:16）
- [x] 3.3 修改 `InlineImageCard.tsx` — 无 prompt 时渲染参数卡而非立即展示生成按钮
