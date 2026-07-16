## Why

市场分析是 AllyGo 的重要能力（in_scope: `market-analysis`），但目前在移动端对话入口和桌面端输入菜单中缺少快捷入口。用户需要手动输入触发市场分析的文本，操作路径长。添加快捷按钮可降低使用门槛，提升功能发现率。

## What Changes

1. **移动端（ScreenChat.tsx）**：对话框上方快捷按钮区新增「市场分析」按钮，点击后输入框填充内容"我要对[产品名]进行市场分析"
2. **桌面端（ChatInput.tsx）**：输入框浮层菜单中，将占位的「📈 数据」按钮改为「📈 市场分析」，行为同上
3. 不修改已有功能的业务逻辑，纯入口 UI 改动

## Capabilities

### New Capabilities

无新增 capability——`market-analysis` 已存在，行为未变。

### Modified Capabilities

无修改——`market-analysis`、`mobile-chat-session`、`chat-input-plus-menu` 的 requirement 未变化，仅在已有 UI 组件中新增一个入口按钮。

## Impact

| 文件 | 改动类型 |
|------|----------|
| `frontend/src/pages/mobile-workbench/ScreenChat.tsx` | 新增 handler + 按钮 (.qb) |
| `frontend/src/components/ChatInput.tsx` | 替换占位按钮 handler + 修改 label/文案 |

无 API 变更、无数据层变更、无依赖变更。
