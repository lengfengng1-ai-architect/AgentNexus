## 1. ChatBubble 按钮守卫

- [x] 1.1 `ChatBubble.tsx` — 按钮显示条件增加 generationPrompt(videoPrompt/imageUrl) 非空校验，空时不显示按钮
- [x] 1.2 `ChatBubble.tsx` — `handleNavigate` 移除 `|| message.content` fallback，无有效 prompt 不跳转

## 2. 同步主 spec

- [x] 2.1 同步 `openspec/specs/video-generation/spec.md` 增加前端守卫场景
