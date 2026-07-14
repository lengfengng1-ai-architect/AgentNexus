## Context

当前 ① 对话入口屏底部的快捷按钮「产品海报」(handlePosterTemplate) 和「产品视频」(handleVideoTemplate) 只是将模板文本填入输入框，让用户手动发送。后端 Agent 可能将含模板文本的消息识别为 generate_plan intent，导致跳转到 ② 简报页。

实际上，ChatBubble 组件已内嵌 InlineImageCard 和 InlineVideoCard，它们有完整的参数配置→生成→结果展示 UI。唯一缺失的是：如何让这些卡片出现在对话流中。

## Goals / Non-Goals

**Goals:**
- 点击「产品海报」按钮后，对话流中直接展开 InlineImageCard（含图片描述、尺寸选择、生成按钮）
- 点击「产品视频」按钮后，对话流中直接展开 InlineVideoCard（含图片URL、参数面板、生成按钮）
- 不跳转页面，不依赖后端返回特定 intent
- 支持用户同时打开多个图片/视频生成卡片（每条消息独立）

**Non-Goals:**
- 不修改 InlineImageCard / InlineVideoCard 现有 UI 和逻辑
- 不修改后端识别逻辑
- 不修改 localStorage 持久化（虚拟消息同流式消息，不持久化）
- 不涉及后端 SSE 流
- 不删除原有「产品海报」「产品视频」通过输入框发送的路径，仅修改按钮行为

## Decisions

### 1. 选择「虚拟消息注入」而非「修改后端 prompt」

**方案 A（虚拟消息注入，选此方案）**：
- 在前端 `useChat` hook 中新增 dispatch action `ADD_VIRTUAL_MESSAGE`
- 前端的 ChatBubble 已有完整的从 message 对象到 InlineImageCard/InlineVideoCard 的渲染路径
- 只需构造一个符合 `ChatMessage` 类型的对象，设定正确的 `intent` 字段即可
- 零后端改动，零组件改动

**方案 B（修改后端 prompt 使其识别图片/视频意图）**：
- 需要修改后端 Agent 的 system prompt，加入图片/视频模板文本识别规则
- 后端 Agent 当前流式返回，需要等一轮 SSE 完成才能展示卡片
- 用户需要先发送→等后端返回→才能看到参数面板，体验差
- 需要后端改动 + 部署，周期长

**结论**：方案 A 更简单、更即时、更符合用户体验预期。

### 2. 虚拟消息的 ID 约定

使用 `virtual-{intent}-{timestamp}` 格式，区别于 SSE 流的 `stream-*` 和持久化消息的 `ai-*`。这样在 reducer 中可以区分处理：不持久化、不发送 SSE、不参与会话历史。

### 3. 虚拟消息的生命周期

- 创建后追加到 `messages` 数组，用户可见
- 不保存到 localStorage
- 页面刷新后丢失（与流式消息一致）
- 不影响会话历史上下文（不参与 `conversation_history` 构建）

## Risks / Trade-offs

- **虚拟消息在刷新后丢失** → 与流式消息的行为一致，用户可重新点击按钮。如果后续需要持久化，可以改为保存到 localStorage。
- **消息列表中有虚拟消息时不阻塞发送新消息** → 用户可在图片/视频生成过程中继续发其他消息。现有 `isLoading` 机制可确保不冲突。
- **虚拟消息与后端返回的真实 AI 消息混排** → 通过 ID 前缀 `virtual-` 区分，不影响后续 SSE 处理逻辑。
