## Context

InlineVideoCard 当前接收 `imageUrls`（string[]）和 `prompt`（string|null）两个输入 prop。当 `generate_video` 意图识别返回 `image_url: null` 和 `video_prompt: null` 时，两个 prop 均为空/空数组，InlineVideoCard 渲染为仅有参数面板 + [生成视频] 按钮。用户无法在 Card 内补充输入，体验断点。

当前组件状态机：
```
Props: imageUrls=[] + prompt=null
  → 隐藏缩略图区域
  → 隐藏 prompt 预览
  → 显示参数面板（折叠）+ [生成视频] 按钮
  → 用户点生成 → POST 带空 image_urls + null prompt → API 报错或返回无用结果
```

## Goals / Non-Goals

**Goals:**
- InlineVideoCard 在缺少输入时显示 URL 输入和描述输入，用户补充后点生成
- 输入 UI 复用 ChatInput 附件栏的设计模式（单行 URL 输入 + 缩略图预览）
- 生成的请求参数取输入框的值，而非仅 prop 值
- 无后端改动

**Non-Goals:**
- 不修改 ChatInput 的附件栏行为
- 不修改后端意图识别逻辑
- 不增加图片上传功能（只支持 URL）
- 不修改 SSE 流式生成逻辑

## Decisions

### 决策 1：输入 UI 放在 InlineVideoCard 内部，而非 ChatBubble 层

- **方案 A（选）**：InlineVideoCard 内部根据 `imageUrls` 和 `prompt` prop 的有无动态渲染输入框
- **方案 B**：ChatBubble 或有状态包装组件在渲染 InlineVideoCard 前先展示输入收集 UI
- **理由**：方案 A 保持 Card 的自包含性，避免 Coupling。Card 已有参数面板的展开/折叠状态管理，增加输入状态是自然的扩展。`handleGenerate` 中组装 params 时直接取 input state 即可。

### 决策 2：URL 输入采用单行 input + 缩略图（同 ChatInput 附件栏）

- 复用现有 ThumbnailPreview 模式：input 内嵌缩略图预览，加载失败显示占位符
- 与 ChatInput 附件栏的行为一致：自动追加空行、支持粘贴拆分、最多 9 张
- 复用现有 normalizeUrl 逻辑（验证 http/https）

### 决策 3：描述输入采用 textarea

- 视频描述不同于 URL，可能需要多行文本
- 显示行数：2-3 行，自动伸缩
- placeholder 提示用户输入视频内容描述

## 组件状态流

```
Props: imageUrls=[], prompt=null
  ↓
InlineVideoCard 渲染输入态
  ├─ URL 输入区域（当 imageUrls.length === 0）
  │   └─ URL 输入行 + 缩略图预览
  ├─ 描述输入区域（当 !prompt）
  │   └─ textarea placeholder="描述希望生成的视频内容…"
  ├─ 参数面板（折叠）
  └─ [生成视频] 按钮

用户输入 URL 和/或描述后点生成
  ↓
handleGenerate 从 input state 取 url + text
  ↓
调用 streamVideoGeneration({ prompt, image_urls, ...params })
  ↓
...... 后续 SSE 进度/结果/错误逻辑不变 ......
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| URLs 组件膨胀：InlineVideoCard 从 350 行增长 | 将 URL 输入和缩略图提取为内部子组件 `UrlInputRow` 和 `ThumbnailPreview` |
| 用户同时从 ChatInput 附了图片 + Card 内又输入 URL，重复 | 优先级：Card 内部输入 > prop。prop 有值时隐藏 Card 输入框 |
| textarea 在卡片布局内可能被截断 | 设置 max-height + overflow-y: auto |
