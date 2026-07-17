# Delta: inline-video-gen（移动端样式重设计）

本 delta 仅修改移动端（`variant === 'mobile'`）卡片的视觉呈现要求，PC 端样式与既有行为（URL 行交互、SSE 进度、结果持久化）不变。

## ADDED Requirements

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
