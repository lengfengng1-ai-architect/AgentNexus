## MODIFIED Requirements

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
