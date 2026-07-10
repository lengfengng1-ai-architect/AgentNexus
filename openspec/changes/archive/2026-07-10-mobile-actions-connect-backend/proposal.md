## Why

移动端行动建议屏（ScreenActions）当前展示的是硬编码假数据，与后端实际生成的方案内容脱节。用户完成方案生成后跳转到行动建议屏，需要看到基于真实方案数据生成的平台操作建议和外部推广建议。

## What Changes

1. **提升 useMobilePlanRun 到 MobileWorkbenchPage**：将 hook 从 ScreenGenerate 中提取到父级组件，数据通过 props 下传给子页面
2. **重写 ScreenActions**：替换假数据为从 outputs（plan_data_query / strategy_generation / fitness_analysis / action_recommendations 等）动态生成的卡片
3. **新增 MobilePlanRunAPI 类型导出**：支持父组件通过 props 传递完整的 planRun 状态
4. **修改 ScreenGenerate**：不再自己调用 useMobilePlanRun，改为接收父组件传入的 planRun prop

## Capabilities

### New Capabilities

- `mobile-actions-screen`: 移动端行动建议屏，展示基于方案内容的平台操作建议（赛事活动、合作招募、排行榜、奖杯定制、促销、达人合作）和外部推广建议（小红书、抖音），数据全部来自后端 outputs

### Modified Capabilities

无。不涉及前端能力行为变更，仅数据源从假数据改为后端真实数据。

## Impact

- **前端文件**：ScreenActions.tsx / MobileWorkbenchPage.tsx / ScreenGenerate.tsx / useMobilePlanRun.ts
- **无后端改动**：所有数据均来自已有 outputs 字段
- **无新增依赖**
