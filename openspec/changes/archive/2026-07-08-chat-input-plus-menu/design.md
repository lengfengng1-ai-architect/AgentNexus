## Context

当前聊天输入框左侧有一个独立的 📎 附件按钮，用于展开图片 URL 输入栏。随着功能迭代，需要新增做方案快捷入口、语音识别、制图、数据等多个功能，独立按钮布局不可扩展。

本次变更仅在 `frontend/src/components/ChatInput.tsx` 中实现，不涉及后端、API、数据库变更。

## Goals / Non-Goals

**Goals:**

- 将 📎 附件按钮替换为 ➕ 聚合按钮，收纳所有功能入口
- 点击 ➕ 弹出浮层面板，支持 5 个功能入口：📎附件、🖼️制图、📋方案、💬语音、📈数据
- 📋方案：预填品牌需求模板到 textarea，自动聚焦，按 Enter 即发
- 💬语音：调用浏览器 SpeechRecognition API，识别结果填入 textarea
- 🖼️制图和 📈数据：点击后 Toast "功能开发中"，占位预留

**Non-Goals:**

- 不涉及后端 API 变更
- 不涉及语音识别后端处理（纯前端 API）
- 不实现制图和数据功能的具体逻辑
- 不修改 ChatContainer 或 useChat hook 的逻辑（仅在 ChatInput 内封闭变更）

## Decisions

### 1. 浮层面板采用纯 CSS 定位 + Portal 而非 Dialog

**决定**：使用 `position: absolute` + `z-index` 浮层面板（Portal 可选），而非引入 Dialog/Modal 组件。

**理由**：面板在 ➕ 按钮正上方展开，位置固定且无复杂交互（无拖拽、无键盘导航菜单），用一个 div + 定位即可实现，避免引入重量级组件。点击面板外部 / 点击任意功能项均关闭面板。

### 2. SpeechRecognition 采用原生 API

**决定**：直接使用 `webkitSpeechRecognition` / `SpeechRecognition`，不引入第三方语音识别库。

**理由**：MVP 阶段浏览器原生语音识别足以满足需求；功能单一（持续识别 → 填入 textarea），无后端处理。Chrome/Edge/ Safari 均支持 `webkitSpeechRecognition`。不支持时提示并降级。

| 浏览器 | 支持 |
|--------|------|
| Chrome / Edge | ✅ 支持 `webkitSpeechRecognition` |
| Safari 14.1+ | ✅ 支持 |
| Firefox | ❌ 不支持 → Toast 提示 |

### 3. 面板数据使用组件内 state 而非外部状态管理

**决定**：菜单展开/关闭状态用 `useState` 在 ChatInput 内闭环管理。

**理由**：面板状态是 ChatInput 组件的纯 UI 状态，无需上提到 ChatContainer 或 useChat hook。

### 4. 语音录音状态通过 ➕ 按钮外观变化反馈

**决定**：录音中 ➕ 按钮变为 🎤 图标+呼吸动画（pulse class），停止后恢复为 ➕。

**理由**：不需要额外的录音指示条；按钮本身的视觉变化足够给用户反馈，保持 UI 整洁。

## 交互状态机

```
                                        点击 📋方案
                                        ┌─────────────┐
                                        │ prefill模板  │
                                        │ autoFocus    │
                                        │ Enter→send   │
                                        └──────────────┘
                    ┌──────────────┐    点击 💬语音
    ───────────     │              │    ┌──────────────────┐
   │ 默认态    │ ←──│ 面板展开态    │──→ │ 录音中...         │
   │ [➕]      │     │              │    │ [🎤] 呼吸动画     │
   │ textarea  │     │ 📎🖼️📋💬📈 │    │ 文字追加到textarea│
   │ [📤]      │     └──────────────┘    └──────────────────┘
    ───────────         ↑ 点击外部         停止说话/手动停止
       │ 点击 ➕          │                    │
       └─────────────────┘                    │
                                              ↓
                                         ───────────
                                        │ 默认态    │
                                        │ textarea已│
                                        │ 填入文字   │
                                        └───────────┘
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| SpeechRecognition 在某些浏览器不支持 | 检测 API 可用性，不支持时 Toast 提示 |
| 语音识别结果不准确 | 识别结果填入 textarea 供用户编辑后再发送，不做直接自动发送 |
| 浮层面板在移动端遮挡输入框 | 面板定位在 ➕ 上方而非下方，且点击功能项即关闭，影响可控 |
| 面板内容过多时视觉拥挤 | 最多 5 项，2-3 列网格布局，空间足够 |
