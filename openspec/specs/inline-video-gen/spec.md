# Capability: inline-video-gen

## Purpose

在对话上下文中内嵌视频生成能力。用户无需离开聊天页面即可完成图片 URL 输入、参数调整、视频生成、进度追踪和视频播放。复用后端 SSE 流式接口，不改变后端逻辑。

## Requirements

### Requirement: ChatInput SHALL 支持 📎 按钮展开附件栏

ChatInput 左侧 SHALL 提供 📎（或 🖼️）按钮，点击后展开 URL 附件输入栏，支持用户输入一个或多个图片 URL 作为视频生成的参考图片。

#### Scenario: 点击 📎 按钮展开附件栏
- **WHEN** 用户点击 ChatInput 左侧的 📎 按钮
- **THEN** 输入框上方展开附件栏，显示空的 URL 输入行
- **AND** 📎 按钮变为激活状态样式

#### Scenario: 再次点击 📎 收起附件栏
- **WHEN** 附件栏已展开，用户再次点击 📎 按钮
- **THEN** 附件栏收起
- **AND** 输入框中已输入的 URL 被清除

### Requirement: URL 输入 SHALL 使用行级交互

附件栏中 SHALL 使用独立的 URL 输入行替代多行 textarea，每行一个 input 元素。

#### Scenario: 输入 URL 后自动追加空行
- **WHEN** 用户在 URL 输入行中输入内容
- **THEN** 自动在下方追加一个空的 URL 输入框
- **AND** 最多支持 9 个输入行

#### Scenario: 删除 URL 行
- **WHEN** 用户点击某 URL 行的删除按钮
- **THEN** 该行 SHALL 被移除
- **AND** 对应的缩略图预览 SHALL 消失
- **AND** 当只剩一行时，删除该行将清空内容而非移除

#### Scenario: 批量粘贴多 URL
- **WHEN** 用户在 URL 输入行中粘贴包含换行或逗号分隔的多个 URL
- **THEN** 系统 SHALL 自动按分隔符拆分并填充到各输入行

### Requirement: URL 行 SHALL 实时显示图片缩略图

每个 URL 输入行右侧 SHALL 显示对应图片的缩略图，加载失败时显示占位符。

#### Scenario: URL 有效时显示缩略图
- **WHEN** 用户输入有效的图片 URL 并失焦（或按下 Tab/Enter）
- **THEN** 输入行右侧显示 48x48 的缩略图预览
- **AND** 缩略图使用 `loading="eager"` 确保加载

#### Scenario: URL 无效时显示占位符
- **WHEN** 图片加载失败
- **THEN** 缩略图区域显示"加载失败"占位文本

#### Scenario: 发送消息后附件栏自动收起
- **WHEN** 用户点击发送按钮
- **THEN** 附件栏自动收起
- **AND** 所有 URL 输入行内容被清除

### Requirement: InlineVideoCard SHALL 自包含视频生成生命周期

ChatBubble 检测到 video intent 时 SHALL 渲染 InlineVideoCard，该 Card 独立管理从参数配置到生成到播放的全部状态。

#### Scenario: 渲染 InlineVideoCard
- **WHEN** ChatBubble 收到 INTENT_RECEIVED action，intent 为 `generate_video` 或 `text_to_video`
- **THEN** 渲染 InlineVideoCard 在聊天气泡内
- **AND** Card 显示图片缩略图（如有 image_urls）
- **AND** 当 imageUrls 为空时显示 URL 输入框（供用户补充图片 URL）
- **AND** 当 prompt 为空时显示视频描述输入框（供用户补充文字描述）
- **AND** 参数面板默认折叠，显示默认参数值
- **AND** 显示 [生成视频] 按钮

#### Scenario: 无 image_urls 时显示 URL 输入框
- **WHEN** intent 为 `text_to_video` 且无 image_urls
- **THEN** InlineVideoCard 显示 URL 输入框（供用户补充参考图片）
- **AND** 显示 prompt 预览 + 描述输入框 + 参数面板 + 生成按钮

### Requirement: InlineVideoCard SHALL 支持空输入状态时提供图片 URL 和视频描述输入

当 `generate_video` 意图识别后，如果 `imageUrls` 为空且 `prompt` 为空，InlineVideoCard SHALL 显示图片 URL 输入框和视频描述文本框，用户可补充输入后点击生成按钮。

#### Scenario: 无 imageUrls 时显示 URL 输入框
- **WHEN** InlineVideoCard 接收到 `imageUrls=[]`（无参考图片）
- **THEN** 参数面板上方显示 URL 输入区
- **AND** URL 输入区包含一个空白的文本输入框，placeholder 为"输入图片 URL…"
- **AND** 输入有效 URL 后右侧实时显示缩略图预览
- **AND** 用户输入 URL 后自动追加空行，最多支持 9 个输入行
- **AND** 支持粘贴换行/逗号分隔的多个 URL 自动拆分

#### Scenario: 无 prompt 时显示描述输入框
- **WHEN** InlineVideoCard 接收到 `prompt=null` 或 `prompt=""`
- **THEN** 参数面板上方显示视频描述输入 textarea
- **AND** textarea placeholder 为"描述希望生成的视频内容…（可选）"
- **AND** textarea 最小高度 2 行，最多 4 行自动伸缩

#### Scenario: 从输入框取值生成
- **WHEN** 用户点击 [生成视频] 按钮
- **THEN** `handleGenerate` 从 input state（而非 prop）取 URL 列表和描述文本
- **AND** 组装 POST 参数时 `image_urls` 为输入框的 URL 列表，`prompt` 为输入框的描述文本
- **AND** 后续 SSE 流式生成流程不变

#### Scenario: 输入值优先级高于 prop
- **WHEN** `imageUrls` prop 非空（有 ChatInput 附件传入的图片）
- **THEN** 不显示 URL 输入框（已有图片）
- **AND** 生成时取 prop 的 imageUrls
- **WHEN** `prompt` prop 非空（意图识别带回了 video_prompt）
- **THEN** 不显示描述输入框
- **AND** 生成时取 prop 的 prompt

### Requirement: InlineVideoCard SHALL 支持 SSE 流式进度显示

点击生成按钮后，InlineVideoCard SHALL 调用 `streamVideoGeneration()`，在生成过程中显示进度条、百分比和已等待时间。

#### Scenario: 点击生成按钮启动 SSE
- **WHEN** 用户点击 InlineVideoCard 中的 [生成视频] 按钮
- **THEN** 按钮变为禁用状态，显示"生成中…"
- **AND** 调用 `streamVideoGeneration(params)` SSE 流式接口
- **AND** 显示单行状态：「正在生成视频… 已等 Xs」
- **AND** 进度条实时更新（progress_pct 0-90% 估算法）

#### Scenario: 用户发送新消息时取消生成
- **WHEN** InlineVideoCard 正在生成中，用户发送新的聊天消息
- **THEN** InlineVideoCard 通过 AbortController 取消进行中的 SSE 请求
- **AND** Card 显示"已取消"状态

#### Scenario: 生成完成显示播放器
- **WHEN** SSE 流返回 result event
- **THEN** 进度条达到 100%
- **AND** 隐藏生成按钮和进度条
- **AND** 显示视频播放器（内联）
- **AND** videoResult 回写到 ChatMessage

#### Scenario: 生成失败显示错误
- **WHEN** SSE 流返回 error event 或请求异常
- **THEN** InlineVideoCard 显示红色错误提示
- **AND** [生成视频] 按钮恢复可用，允许重试
- **AND** 错误信息包含具体原因

### Requirement: 参数面板 SHALL 支持折叠

InlineVideoCard 中的视频参数（分辨率、宽高比、时长等）SHALL 默认折叠。用户可按需展开调整。

#### Scenario: 默认折叠参数
- **WHEN** InlineVideoCard 首次渲染
- **THEN** 参数区域显示折叠状态
- **AND** 显示当前参数摘要文本（如 "720p · 16:9 · 5s"）
- **AND** 显示展开箭头按钮

#### Scenario: 展开调整参数
- **WHEN** 用户点击参数区域展开按钮
- **THEN** 显示完整参数控件（resolution/ratio/duration/seed）
- **AND** 参数调整后立即生效（下次生成使用新参数）

### Requirement: 视频播放器 SHALL 支持内联播放

生成完成后 SHALL 显示内联视频播放器，支持播放/暂停和进度控制。

#### Scenario: 内联播放视频
- **WHEN** 视频生成完成，video_url 可用
- **THEN** 显示内联视频播放器（宽度 100%，自动高度）
- **AND** 显示播放/暂停按钮
- **AND** 视频自动加载但不自动播放

### Requirement: 全屏播放 SHALL 使用弹窗

播放器中 SHALL 提供全屏切换按钮，点击后使用 React Portal 弹窗显示视频全屏播放。

#### Scenario: 全屏播放
- **WHEN** 用户点击播放器上的全屏按钮
- **THEN** 弹窗覆盖整个视口，播放器居中
- **AND** 弹窗背景为半透明黑色遮罩
- **AND** 点击遮罩区域或关闭按钮退出全屏

#### Scenario: 全屏中退出
- **WHEN** 用户在全屏弹窗中点击关闭按钮或点击遮罩
- **THEN** 弹窗关闭
- **AND** 回到对话上下文中内联播放器状态

### Requirement: InlineVideoCard SHALL 支持移动端 variant 样式

`variant="mobile"` 时 InlineVideoCard SHALL 切换为移动端蓝色系色值、缩紧间距、调小字号。桌面端行为零变化。

#### Scenario: variant=mobile 时使用移动端样式
- **WHEN** InlineVideoCard 的 `variant` prop 为 `"mobile"`
- **THEN** 卡片背景为 `bg-[#f7f8fa]`（替代 `bg-mist/50`）
- **AND** 卡片边框为 `border-[#d9dee7]`（替代 `border-line`）
- **AND** 主按钮背景为 `bg-[#1677ff]`（替代 `bg-start`）
- **AND** 标签/说明文字色为 `text-[#6b7280]`（替代 `text-track/50`）
- **AND** 输入框边框为 `border-[#d9dee7]`（替代 `border-line`）
- **AND** 输入框 focus 为 `focus:border-[#1677ff]`（替代 `focus:border-start`）
- **AND** 卡片内边距为 `p-2.5`（替代 `p-3`）
- **AND** 主体字号为 `text-[11px]`（替代 `text-xs`/12px）
- **AND** label 字号为 `text-[9px]`（替代 `text-[10px]`）
- **AND** 生成按钮字号为 `text-xs`（替代 `text-sm`/14px）

#### Scenario: variant 不传或为 undefined 时使用桌面端样式
- **WHEN** InlineVideoCard 的 `variant` prop 未传或为 `undefined`
- **THEN** 使用桌面端原有样式（`bg-mist/50`、`border-line`、`bg-start` 等）
- **AND** 所有样式行为与修改前一致

### Requirement: 移动端视频卡片 SHALL 使用纯白卡片基底

移动端 `InlineVideoCard` 编辑态 SHALL 使用纯白底 + 细边框 + 轻阴影的卡片容器（圆角 16px），替代灰底（#f7f8fa）硬边框样式；卡片内层级 SHALL 依靠留白与 hairline 分隔；正文与输入字号 SHALL ≥ 12px。

#### Scenario: 移动端编辑态渲染
- **WHEN** 移动端对话中渲染 `InlineVideoCard` 编辑态
- **THEN** 卡片容器 SHALL 为白底、16px 圆角、带细边框与轻阴影
- **AND** 顶部 SHALL 显示意图标题行（图标 + 「生成视频」），AI 优化按钮收敛在标题行右侧
- **AND** label 字号 SHALL 不小于 12px

#### Scenario: 生成按钮形态
- **WHEN** 移动端编辑态展示生成按钮
- **THEN** 按钮 SHALL 为全宽、accent 实底、胶囊圆角（≥20px）

### Requirement: 移动端视频完成态 SHALL 收敛操作与参数信息

移动端生成完成后 SHALL 去掉灰底容器：视频以卡片同宽大圆角直接展示；参数信息（分辨率/宽高比/时长）SHALL 收敛为一行 muted 小字并以 `·` 分隔；操作收敛为一行 muted 文字链接（全屏 · 重新生成）。

#### Scenario: 完成态布局
- **WHEN** 移动端视频生成成功
- **THEN** 视频播放器 SHALL 撑满卡片宽度、大圆角展示，无额外灰底包裹
- **AND** 参数信息 SHALL 显示为一行（如 `720P · 16:9 · 5s`），muted 色
- **AND** 播放器下方 SHALL 有一行 muted 色文字链接：全屏、重新生成
- **AND** 点击「重新生成」SHALL 回到编辑态
