# Delta: inline-image-gen（移动端样式重设计）

本 delta 仅修改移动端（`variant === 'mobile'`）卡片的视觉呈现要求，PC 端样式与既有行为（API 调用、结果持久化、错误处理）不变。

## ADDED Requirements

### Requirement: 移动端图片卡片 SHALL 使用纯白卡片基底

移动端 `InlineImageCard` 编辑态 SHALL 使用纯白底 + 细边框 + 轻阴影的卡片容器（圆角 16px），替代灰底（#f7f8fa）硬边框样式；卡片内层级 SHALL 依靠留白与 hairline 分隔，而非边框堆叠；正文与输入字号 SHALL ≥ 12px。

#### Scenario: 移动端编辑态渲染
- **WHEN** 移动端对话中渲染 `InlineImageCard` 编辑态
- **THEN** 卡片容器 SHALL 为白底、16px 圆角、带细边框与轻阴影
- **AND** 顶部 SHALL 显示意图标题行（图标 + 「生成图片」），AI 优化按钮收敛在标题行右侧
- **AND** label 字号 SHALL 不小于 12px

#### Scenario: 尺寸选择 chip 选中态
- **WHEN** 用户在移动端选择图片尺寸
- **THEN** 选中的 chip SHALL 为 accent 实底白字
- **AND** 未选中的 chip SHALL 为白底灰边 muted 文字

#### Scenario: 生成按钮形态
- **WHEN** 移动端编辑态展示生成按钮
- **THEN** 按钮 SHALL 为全宽、accent 实底、胶囊圆角（≥20px）

### Requirement: 移动端图片卡片加载态 SHALL 使用骨架屏

移动端图片生成中 SHALL 显示图片比例的骨架屏占位（shimmer 动画），替代居中大转圈。

#### Scenario: 生成中展示骨架屏
- **WHEN** 用户在移动端点击生成且请求进行中
- **THEN** 卡片 SHALL 显示与所选尺寸比例一致的骨架屏占位
- **AND** 骨架屏 SHALL 带 shimmer 扫光动画
- **AND** SHALL 显示一行状态文字（如「正在生成图片…」）

### Requirement: 移动端图片完成态 SHALL 直接去容器展示

移动端生成完成后 SHALL 去掉灰底容器：图片以卡片同宽大圆角直接展示，操作收敛为图片下方一行 muted 文字链接（全屏 · 复制链接 · 重新生成）。

#### Scenario: 完成态布局
- **WHEN** 移动端图片生成成功
- **THEN** 图片 SHALL 撑满卡片宽度、大圆角展示，无额外灰底包裹
- **AND** 图片下方 SHALL 有一行 muted 色文字链接：全屏、复制链接、重新生成
- **AND** 点击「重新生成」SHALL 回到编辑态
