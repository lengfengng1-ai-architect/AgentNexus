## ADDED Requirements

### Requirement: "填写简报"按钮 SHALL 携带当前输入文本跳转到②简报屏

点击"填写简报"时，SHALL 将 ScreenChat 的 inputValue 传递给 MobileWorkbenchPage，由后者传给 ScreenBrief 用于字段预填。

#### Scenario: 点击填写简报携带输入文本
- **WHEN** 用户在 ScreenChat 输入框中有文本（如"我是娃哈哈，属于饮品，想在北京上海做活动"）
- **AND** 用户点击"填写简报"按钮
- **THEN** ScreenChat SHALL 调用 `onNavigate('brief', inputValue)`
- **AND** MobileWorkbenchPage SHALL 暂存文本并传给 ScreenBrief
- **AND** ScreenBrief 挂载时解析文本并预填对应表单字段

#### Scenario: 输入框为空时仍可跳转但无预填
- **WHEN** 用户输入框为空
- **AND** 用户点击"填写简报"按钮
- **THEN** SHALL 切换到②简报屏
- **AND** 表单字段使用默认 mock 数据

### Requirement: 输入语音按钮 SHALL 从快捷按钮行移至输入框行内

文字版"语音输入"按钮从 `.quick-btns` 中删除，在 `.inputbar-row` 的输入框与发送按钮之间插入圆形 mic 小按钮（SVG 简笔线条图标），点击触发 `handleVoice`。

#### Scenario: 语音按钮迁移布局
- **WHEN** ScreenChat 渲染
- **THEN** `.quick-btns` 中 SHALL 不包含"语音输入"文字按钮
- **AND** `.inputbar-row` 中 input 与 ↑ 之间 SHALL 有一个圆形 mic 按钮
- **AND** mic 按钮 SHALL：宽高 38px、圆形、背景透明（hover 时浅灰）、SVG path 简笔 mic 线条、图标色 `var(--muted)`
- **AND** 点击 mic 按钮 SHALL 触发语音识别（与原先文字按钮行为一致）
