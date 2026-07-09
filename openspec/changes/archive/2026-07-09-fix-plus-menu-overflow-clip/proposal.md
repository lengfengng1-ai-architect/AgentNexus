## Why

点击 ➕ 按钮弹出浮层面板时，面板内容被上层容器的 `overflow-hidden` CSS 属性裁剪，导致菜单项不可见。这是一个纯 CSS 布局 Bug，影响核心交互——用户无法使用附件、语音、方案模板预填等任何菜单功能。

## What Changes

将浮层面板的 DOM 定位从 `overflow-hidden` 容器内部移出，使其不受 `overflow` 裁剪影响，同时保持 UI 位置和交互行为不变。

具体变更：
- 在输入容器外层新增一个独立的浮动层锚点
- 将菜单面板 (`div.absolute.bottom-full`) 从 `div.relative` 内部移到外层锚点
- 保持菜单面板的视觉样式和定位逻辑不变

**不涉及**功能行为变更、API 变更或数据流变化。

## Capabilities

### New Capabilities

无新增 capability。

### Modified Capabilities

- `chat-input-plus-menu`: 菜单面板定位修复，无 requirement 变更，仅 implementation 细节调整。

## Impact

- **前端文件**: `frontend/src/components/ChatInput.tsx` — DOM 结构调整，`showMenu` state 和 `handlePlusClick` 等逻辑不变
- **不涉及**: 后端、API、依赖、测试（仅 DOM 结构调整，交互逻辑不变）
