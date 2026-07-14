## Why

点击 ChatBubble 的「生成方案」后跳转到 ② 简报屏时，表单字段和蓝色头部标题未按用户输入的对话内容自动填充，仍显示默认 mock 数据。同时，直接点击 Tab「方案生成」进入简报时，表单不应有任何预设默认值。根因是 ScreenBrief 的 useState 初始值只在首次挂载时执行，外部 props 变化后 state 不会同步更新。

## What Changes

- **ScreenBrief 新增 useEffect，监听 mergedDefaults 变化并同步到所有 useState**：当 `initialInput` 或 `initialBrandData` props 变化时，表单字段和蓝色头部标题自动更新为解析后的值。
- **无 props 跳转时（Tab「方案生成」从对话入口跳转）表单字段使用空字符串默认值**：fallback 从 mock 数据（娃哈哈/果汁饮料）改为空字符串，用户直接填写。
- **form 表单下拉选项保留**：目标人群/投放周期的 `<option>` 不变，用户可点击选择。
- **蓝色头部（wk-head）同步更新**：`brand`/`category`/`productMatrix`/`marketingGoal`/`period` 等 state 同步后，wk-head 渲染内容自动跟随。

## Capabilities

### New Capabilities
- （无）

### Modified Capabilities
- `mobile-workbench-preview`：② 简报屏表单的字段初始化逻辑从"挂载时一次性"改为"响应 props 变化更新"；无 props 跳转时使用空字符串默认值。

## Impact

- `frontend/src/pages/mobile-workbench/ScreenBrief.tsx` — 新增 useEffect 同步 state，删除默认 mock 字符串 fallback
