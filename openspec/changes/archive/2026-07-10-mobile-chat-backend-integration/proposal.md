## Why

移动端 ScreenChat（①对话入口）当前使用本地硬编码 Msg[] 和 setTimeout 模拟回复，无法与后端对话流程打通。用户消息无法触发意图识别、品牌信息积累、方案生成等后端能力。需要将 ScreenChat 对接后端 `/chat/stream` SSE 端点，使移动端对话入口具备与桌面端一致的完整对话体验。

## What Changes

- **ScreenChat 状态替换**：删除本地 `Msg[]`、`INITIAL`、`AGENT_REPLY`、`seq/nextId()`、`setTimeout` 伪回复，改用 `useChat` hook
- **SSE 流式渲染**：移动端气泡支持 reasoning 打字机效果、isLoading loading 态、error/retry 状态
- **`canGeneratePlan` 导航**：ChatBubble 中「生成方案」按钮或「填写简报」卡片点击后跳转到 brief 屏
- **文件上传**：ScreenChat 的附件按钮由纯 UI 占位改为真实上传（`POST /upload` → 拿到 URL → `sendMessage(text, urls)`）
- **后端 greet 支持**：后端在无 context 时自动回复欢迎语（类似当前 INITIAL[0]），无需前端硬编码
- **不修改后端**：`/chat/stream`、`/upload` 端点均已存在且可用
- **不新增 types**：复用现有 `ChatMessage`、`BrandInput`、`StreamChunk`

## Capabilities

### New Capabilities

- `mobile-chat-session`: 移动端对话入口的完整对话会话管理，包括 SSE 流式收发、基于上下文的品牌信息积累、多轮对话、错误重试

### Modified Capabilities

- `brand-input`: 移动端现在也能通过对话触发品牌信息录入，借助 intent_recognition agent 逐步积累 brand_input 字段

## Impact

- **`frontend/src/pages/mobile-workbench/ScreenChat.tsx`** — 核心改动，状态管理 swap + 文件上传真实化
- **`frontend/src/components/ChatBubble.tsx`** — 可能需添加移动端 CSS 适配属性
- **`backend/app/routers/chat.py`** — 无改动（greet 逻辑若需添加为可选 enhancement）
- **依赖**：无新增依赖，复用已有 axios/fetch + SSE
