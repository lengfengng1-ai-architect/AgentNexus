## ADDED Requirements

### Requirement: 移动端下"生成方案"按钮 SHALL 使用全宽蓝色胶囊样式

当 `variant === 'mobile'` 时，ChatBubble 内的"生成方案"按钮 SHALL 使用与简报屏一致的蓝色主题全宽胶囊样式。

#### Scenario: 移动端按钮样式
- **WHEN** ChatBubble 的 `variant` 为 `'mobile'`
- **AND** `message.canGeneratePlan` 为 true
- **AND** `onGeneratePlan` 已提供
- **THEN** 按钮 SHALL 渲染为：全宽 (`w-full`)、蓝色背景 (`#1677ff`)、白色文字 14px 加粗、圆角 8px、内边距上下 10px
- **AND** 按钮文本 SHALL 为"生成方案"

#### Scenario: PC 端按钮样式不变
- **WHEN** ChatBubble 的 `variant` 不为 `'mobile'`
- **THEN** 按钮 SHALL 使用现有 Tailwind 样式（`bg-start px-3 py-1.5`）
