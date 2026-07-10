## Context

移动端工作台（`/mobile`）的①对话入口屏当前使用本地硬编码消息（`INITIAL` 数组 + `setTimeout` 伪回复），未对接后端。桌面端的 `useChat` hook + `streamChat`（`workflow.ts`）已成熟接入 `POST /chat/stream` SSE 端点，具备完整的对话流式收发能力。

**现状关键点**：
- `ScreenChat.tsx` 管理自身的 `Msg[]` 状态，与 `useChat` 不互通
- 后端的 `/chat/stream`、`/upload` 端点均已存在且可用
- 桌面端 `ChatInput.tsx` 已有完整的文件上传流程（选文件 → `POST /upload` → 拿 URL → `sendMessage`）
- 移动端入口屏需保持自身 UI 风格（蓝/灰气泡、快速按钮、语音等），数据层替换为后端驱动

## Goals / Non-Goals

**Goals:**
- ScreenChat 从本地 mock 数据切换到 `useChat` hook 驱动的 SSE 流式对话
- 移动端气泡复用 `ChatBubble` 组件，支持 reasoning 打字机效果、isLoading 态、error/retry
- 文件附件从纯占位按钮改为真实上传（`POST /upload` → URL → `sendMessage`）
- `canGeneratePlan` 按钮触发后导航到②简报屏
- 后端在无 context 时自动回复 greet 欢迎语
- 保持移动端专属的语音输入、快速按钮、CSS 调色板

**Non-Goals:**
- 不改写后端的 `/chat/stream` 端点逻辑
- 不改写 `useChat` hook 内部 reducer（直接复用）
- 不修改其他 4 屏（②-⑤）的内容或交互
- 不新增 npm 依赖

## Decisions

### 决定 1：复用 `useChat` hook 而非 ScreenChat 独立对接

**方案**：ScreenChat 内调用 `useChat()`，将其 `messages`/`sendMessage`/`isLoading`/`error` 等状态直接映射到 UI 渲染。

**理由**：
- `useChat` 已处理 SSE 流的全部复杂性（`streamChat` 解析、reducer 的 STREAM_REASONING / INTENT_RECEIVED / SET_ERROR 等 action）
- 保持桌面端和移动端的对话状态管理一致，后续修改只需改一处
- `useChat` 已支持 `imageUrls` 参数，文件上传后可直接传入

**替代方案考虑**：ScreenChat 自写 SSE 对接 → 代码重复，两个入口的 reducer 逻辑一旦偏离会增加维护负担。

### 决定 2：复用 `ChatBubble` 组件渲染消息气泡

**方案**：消息渲染从当前的自有 `<div className="bubble">` 改为 `<ChatBubble message={m} />`。

**理由**：
- `ChatBubble` 已处理所有消息展示状态：普通文本、`isStreaming` reasoning 打字机效果、`isLoading` TypingIndicator、`isError` + retry 按钮、`canGeneratePlan` 按钮、`InlineVideoCard` / `InlineImageCard` 内嵌组件
- 避免在 ScreenChat 中重复实现这些条件分支

**适配策略**：给 `.mw` 作用域下覆盖 ChatBubble 产生的原生 DOM 元素的样式（Tailwind class `bg-white shadow-sm` 等 → 覆盖为移动端灰底/蓝底气泡），不修改 ChatBubble 组件逻辑。

### 决定 3：文件上传参照 ChatInput 模式

**方案**：ScreenChat 的附件按钮点击 → 唤起 `fileInputRef` → `onChange` 时构建 `FormData` → `fetch POST /api/v1/upload` → 拿 URL → 配置 `sendMessage(text, imageUrls=urls)`。

**理由**：
- 桌面端 ChatInput 已完整实现该流程，移动端只需复制其上传逻辑
- 后端 `POST /upload` 端点已存在，无需新增 API
- `useChat.sendMessage` 已有 `imageUrls` 参数，可以直接传递

### 决定 4：后端 greet 逻辑

**方案**：`/chat/stream` 端点在 context 为空（无 `brand_input` 和 `conversation_history`）时，自动在 intent 中包含一条欢迎语回复。

**理由**：
- 不需要前端硬编码欢迎语，后端知道当前业务上下文，可以更智能地生成
- `intent_recognition_agent.py` 的 prompt 模板已包含意图规则，稍作调整即可在无 context 时输出特定 `reply`

**当前方案**：`intent_recognition.md.j2` 模板中根据 message 内容判断，若 message 为新对话典型开场（"你好"、"hi"等），自然返回欢迎语。无需修改代码，依赖 prompt 本身。

## Risks / Trade-offs

- **[风险]** `ChatBubble` 的 Tailwind 样式与 `.mw` 作用域 CSS 冲突 → 在 `.mw` 下用更高优先级的选择器覆盖（`.mw .chat .bubble` 等），不改 `ChatBubble` 源码
- **[风险]** 快速按钮「填写简报」的导航逻辑变化：以前 ScreenChat 内部 `onNavigate('brief')`，改用 `useChat` 后需从 `canGeneratePlan` 按钮回调触发 → ChatBubble 已有的 `onGeneratePlan` prop 适配，MobileWorkbenchPage 层级处理导航
- **[风险]** 现有 `useChat` 的 `sendMessage` 有 `isProcessingRef` 锁，短时间内连发多条可能被忽略 → 这是桌面端已验证的行为，移动端同样适用
- **[风险]** `ChatBubble` 在 `.mw` 内宽度可能过宽 → 设置 `.mw .flex` 容器的 `max-width` 或 `.mw` 的全局样式覆盖
