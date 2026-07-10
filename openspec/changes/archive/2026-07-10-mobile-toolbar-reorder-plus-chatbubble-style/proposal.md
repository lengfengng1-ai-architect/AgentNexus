## Why

移动端工作台①对话屏的快捷工具栏需要重新排序和命名，作为未来可扩展的工具栏入口；同时 ChatBubble 中的"生成方案"按钮在移动端比例不协调，需做移动端样式适配。

## What Changes

1. 快捷工具栏排序：附件上传 → 方案模版 → 方案生成 → 产品海报 → 产品视频
2. 文案改名：「方案简报模版」→「方案模版」、「一键填充简报」→「方案生成」
3. "方案生成"按钮行为改为 `onNavigate('brief')` 纯跳转，不传 input/BrandData
4. "产品海报"按钮填入海报纸 prompt 模板到输入框
5. "产品视频"按钮填入视频 prompt 模板到输入框
6. ChatBubble `variant === 'mobile'` 时"生成方案"按钮改为全宽蓝色胶囊样式

## Capabilities

### New Capabilities

- `mobile-postergen-prompt`: 产品海报 prompt 模板快速填充
- `mobile-videogen-prompt`: 产品视频 prompt 模板快速填充

### Modified Capabilities

- `mobile-chat-session`: MODIFIED 快捷工具栏按钮排序/文案/行为 + 新增海报/视频按钮
- `mobile-workbench-preview`（ChatBubble 移动端）: ADDED 生成方案按钮全宽蓝色胶囊样式

## Impact

- `ScreenChat.tsx` — 按钮排序、文案、行为改动，新增产品海报/视频按钮
- `ChatBubble.tsx` — 移动端 variant 下"生成方案"按钮全宽蓝色胶囊
- `mobile-workbench.css` — 新增生成方案按钮的移动端样式（如果需隔离 Tailwind）
