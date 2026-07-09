## Context

视频生成功能当前依赖独立 VideoTestPage 页面。对话识别到视频意图后，ChatBubble 渲染跳转按钮，用户点击后跳转至 `/video-test` 页面进行参数调整、生成和播放。测试节点即将取消，所有视频生成功能需直接融合进对话中。

当前相关模块：
- **VideoTestPage** — 独立页面，包含 urlRows 附件输入、参数面板、生成按钮、SSE 进度、视频播放器
- **ChatBubble** — 接收到 video intent 时渲染 [生成视频] 按钮，调用 `onNavigateVideo(prompt, imageUrls)`
- **ChatContainer** — 处理 `handleNavigateVideo`/`handleNavigateImage` 跳转逻辑
- **ChatInput** — 纯文本输入，无附件支持
- **ChatMessage 类型** — `imageUrls?: string[]`，`videoPrompt?: string | null`
- **VideoTestPage 后端接口 (streamVideoGeneration)** — 不变，SSE 流式接口可直接复用

约束：不改变后端 SSE 流式接口、不改变 intent 识别逻辑、不重构 ChatReducer。

## Goals / Non-Goals

**Goals:**
- ChatInput 支持 📎 按钮展开 URL 行级附件输入（复用 VideoTestPage 的 urlRows 交互模式）
- ChatBubble 识别到 video intent 时原地渲染 InlineVideoCard，不跳转页面
- InlineVideoCard 自包含视频生成完整生命周期：图片编辑 → 参数调整（折叠）→ 生成按钮 → SSE 进度条 → 视频播放 → 全屏弹窗
- 生成结果持久化到 ChatMessage.videoResult，刷新页面不丢失
- 移除 ChatContainer 中所有页面跳转导航逻辑

**Non-Goals:**
- 不修改后端视频生成 API 和 SSE 流式接口
- 不修改 intent 识别逻辑（后端 Agent 行为不变）
- 不重构 ChatReducer 或全局状态管理
- 不删除 VideoTestPage 页面文件（保留供参考，路由待后续决定）
- 不涉及用户上传文件（MVP 阶段仅支持 URL 输入）

## Decisions

| # | Decision | Rationale | Alternatives Considered |
|---|---|---|---|
| 1 | InlineVideoCard 自包含状态管理 | 视频生成是 SSE 长连接过程，状态生命周期短，将状态放在组件内避免污染全局 reducer；组件隔离方便后续独立迭代和测试 | 状态放在 ChatReducer → 过度复杂，reducer actions 需要管理 SSE 中间状态 |
| 2 | 📎 按钮式附件栏（toggle 展开/收起） | 不占用常驻输入区域空间，附件是可选操作，用户不需要每次都使用 | 常驻 URL 输入行 → 占用空间；弹出对话框 → 额外交互层级 |
| 3 | 参数面板默认折叠 | 默认参数即可满足多数场景，需要精细控制时展开调整 | 完全隐藏参数 → 用户无法调整；完全展开 → 信息过载 |
| 4 | videoResult 回写 ChatMessage | 刷新页面后播放器不丢失；结果跟随 message 历史 | 仅存组件 state → 刷新丢失；存 localStorage → 与 message 解耦 |
| 5 | 全屏播放用弹窗 overlay | 用户可在对话上下文中查看大尺寸视频，关闭后回到对话 | 新页面打开 → 离开对话上下文 |
| 6 | urlRows 行级输入（单行 input 数组） | 每行独立控制，支持增删，优于 textarea 多行编辑 | textarea + 逗号/换行分隔 → 交互不直观，难增删单条 |
| 7 | 首次加载时自动使用 ChatMessage.imageUrls | 用户之前上传的图片自动填充到附件栏，避免重复输入 | 不填充 → 用户需重新输入；填充全部 → 可能冗余 |

## Risks / Trade-offs

- **[Risk] InlineVideoCard 体积较大**：自包含组件承载图片编辑、参数、SSE、播放器、全屏多个子模块。→ **Mitigation**: 组件内按功能拆分子模块文件（InlineVideoCard/ 目录），主文件仅做编排
- **[Risk] SSE 长连接与 React 组件生命周期冲突**：用户快速切换 message 或发送新消息时，未完成的 SSE 请求可能引发内存泄漏或状态错乱。→ **Mitigation**: InlineVideoCard 在 unmount 时通过 AbortController 取消进行中的 SSE 请求
- **[Risk] videoResult 数据一致性**：message 更新可能与其他异步操作（如流式 LLM 响应）竞争。→ **Mitigation**: videoResult 仅在 SSE result event 到达时一次性写入，写入时机独立于流式 LLM 响应
- **[Trade-off] 不删除 VideoTestPage**：保留独立页面代码但不再引用，可能引入技术债务。→ 路由删除决策延后到单独 change

## Migration Plan

前端部署无停机，逐步替换：
1. 新增 InlineVideoCard 组件（独立文件，不影响现有代码）
2. 修改 ChatMessage 类型（新增 videoResult 可选字段，向后兼容）
3. 修改 ChatInput（新增 📎 附件栏，不影响现有文本输入逻辑）
4. 修改 ChatBubble（video intent 时渲染 InlineVideoCard 替代跳转按钮）
5. 修改 ChatContainer（移除 handleNavigateVideo/handleNavigateImage，清理 props）
6. 验证：手动测试全部 5 种场景（文生图 intent、图生视频 intent、普通对话、刷新后播放器、失败/错误提示）

回滚策略：任何步骤出问题可回退单文件修改，互不依赖。

## Open Questions

- VideoTestPage 路由何时删除？→ 延后到独立 change
- 是否需要在全屏弹窗中显示生成参数信息？→ MVP 暂不包含，后续可加
