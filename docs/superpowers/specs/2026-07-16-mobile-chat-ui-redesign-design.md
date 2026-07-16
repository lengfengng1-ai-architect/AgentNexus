# 移动端聊天界面视觉升级设计草案

> 状态：brainstorming 输出，待 /opsx:explore 澄清与细化。
> 需求来源：用户参考 3 张"灵光"类 AI 助手截图，要求升级当前移动端聊天界面。

## 1. 改动的 capability / 范围边界

### 1.1 涉及的 in_scope 能力
- `brand-input`：品牌需求录入（推荐输入可快速填充 brand input 模板）。
- `plan-generation`：方案生成（推荐入口"推荐方案生成"）。
- `market-analysis`：市场分析（推荐入口"市场分析"）。
- `video-generation`：视频生成（+ 号面板"创建视频"保持现有 virtual message 逻辑）。
- 图片生成（+ 号面板"创建图片"保持现有 virtual message 逻辑）。

### 1.2 明确在范围内
- `ScreenChat` 的 UI 布局与交互重构：
  - 输入框聚焦时的沉浸式推荐态（替代现有 `quick-btns` 横排）。
  - 输入框内部左侧 + 号按钮，点击展开底部操作面板。
  - 底部面板提供：上传附件、创建图片、创建视频。
  - 聊天界面上方新增推荐输入区，带随机小图标和"换一批"。
- 复用现有上传 `/upload`、图片/视频 virtual message、`onNavigate('brief')` 等能力，不改后端。

### 1.3 不在本次范围内
- 不新增后端端点。
- 不改 `ChatContainer` 桌面端逻辑。
- 不改动图片/视频生成内部流程，仅移动入口位置。
- 不实现"方案自动执行""跨平台数据"等 out_scope 能力。

## 2. 需要新增/修改的 UI 组件和状态

### 2.1 修改文件
- `frontend/src/pages/mobile-workbench/ScreenChat.tsx`
  - 移除当前 `quick-btns` 横排。
  - 新增状态 `isInputFocused`、`showActionPanel`、`suggestedPromptsIndex`。
  - 输入框改为左侧 + 号、中间文字输入、右侧语音/发送的组合。
  - 聚焦时：聊天区域上方显示推荐输入区（Hi, 老板 + 换一批 + 推荐卡片）。
  - 点击 + 号：从底部滑出操作面板（附件、图片、视频）。

### 2.2 可抽离的新组件（视代码量决定）
- `ChatSuggestionChips`：顶部推荐输入卡片网格。
- `ChatActionPanel`：底部 + 号面板。
- `FloatingInputBar`：重构后的输入条。

> ponytail：先内联在 ScreenChat 里实现，超过 800 行再拆分。

### 2.3 状态列表
| 状态 | 类型 | 说明 |
|------|------|------|
| `isInputFocused` | boolean | 输入框是否聚焦，控制沉浸式推荐态 |
| `showActionPanel` | boolean | + 号底部面板是否展开 |
| `suggestedPrompts` | string[] | 当前推荐输入文案批次 |
| `prefillMap` | Record<string, () => void> | 推荐文案到现有处理函数的映射 |

## 3. 与现有能力的集成点

### 3.1 推荐输入文案与现有入口映射
| 推荐文案 | 对应现有能力 | 实现方式 |
|----------|--------------|----------|
| 推荐方案生成 | `onNavigate('brief')` | 直接跳转 brief 屏 |
| 预算评估 | `handlePrefillTemplate` | 填充品牌需求模板 |
| 市场分析 | `handleMarketAnalysisTemplate` | 填充市场分析模板 |
| 创建盟域 | 暂无直接入口 | 需要确认：是否填充"帮我创建一个盟域…"文本并发送 |
| 创建活动 | 暂无直接入口 | 需要确认：是否填充"帮我创建一个活动…"文本并发送 |
| 产品海报 | `handlePosterTemplate` | `addVirtualMessage('text_to_image', ...)` |
| 产品视频 | `handleVideoTemplate` | `addVirtualMessage('generate_video', ...)` |

### 3.2 + 号面板与现有能力映射
| 面板项 | 对应实现 |
|--------|----------|
| 上传附件 | `fileInputRef.current?.click()` + `handleFileSelect` |
| 创建图片 | `handlePosterTemplate` |
| 创建视频 | `handleVideoTemplate` |

### 3.3 风格约束
- 保持现有暗色主题、圆角、渐变按钮风格。
- 推荐卡片使用现有 `qb`/`fchip` 风格变体。
- 底部面板使用 `backdrop-filter: blur` + 半透明背景，与现有弹窗一致。

## 4. 风险与待确认问题清单

1. **"创建盟域""创建活动"是否有现成 Agent 能响应？**
   - 当前只是填充文本发送，还是直接走特定 intent？
2. **推荐输入区是否只在空会话/聚焦时显示？**
   - 图 2 风格像空态+聚焦态，是否历史消息存在时仍显示上方推荐？
3. **"换一批"是本地预设数组轮播，还是后端随机？**
   - 建议 MVP 阶段本地预设数组随机打乱。
4. **+ 号面板与键盘同时出现时的层级处理？**
   - 键盘拉起时是否收起面板？
5. **语音输入按钮在输入框内部，与发送按钮如何切换？**
   - 空输入显示语音图标，有文字时显示发送箭头？
6. **是否需要适配桌面端 `ChatContainer`？**
   - 本次仅 mobile-workbench，桌面端不动。

## 5. 下一步

进入 `/opsx:explore 移动端聊天界面视觉升级`，就上述风险点澄清方案，并生成正式 OpenSpec 变更提案。
