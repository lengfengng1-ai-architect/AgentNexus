## ADDED Requirements

### Requirement: 快捷按钮文案和排序变更

系统 SHALL 将快捷按钮行的文案和排序改为：附件 → 方案简报模版 → 一键填充简报。

#### Scenario: 按钮文案和排序
- **WHEN** ① 对话屏渲染
- **THEN** `.quick-btns` 中按钮顺序 SHALL 为「附件」「方案简报模版」「一键填充简报」
- **AND** 按钮文案 SHALL 分别为"附件"、"方案简报模版"、"一键填充简报"

### Requirement: onNavigate 签名扩展支持传入 BrandInput 结构化数据

`onNavigate` SHALL 支持第三个可选参数 `brandData`，用于传递对话意图识别得到的 BrandInput 结构化字段。

#### Scenario: 点击一键填充简报携带 brandData
- **WHEN** 用户点击"一键填充简报"按钮
- **THEN** SHALL 调用 `onNavigate('brief', inputValue, latestBrandInput)`
- **AND** `latestBrandInput` 为 `useChat` 返回的 `BrandInput` 对象（或 undefined）
