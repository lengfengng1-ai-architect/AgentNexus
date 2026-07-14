## Context

ScreenBrief 使用 `useState(mergedDefaults.xxx)` 初始化所有表单字段。由于 MobileWorkbenchPage 使用 `display:none` 切换屏幕而非条件挂载（`{screen === 'brief' ? <ScreenBrief /> : null}`），ScreenBrief 组件只在第一次访问时挂载一次。后续通过「生成方案」按钮从对话入口跳转时，`initialInput` / `initialBrandData` props 更新导致 `mergedDefaults` 重新计算，但 `useState` 不会跟随更新，表单仍显示旧值。

## Goals / Non-Goals

**Goals:**
- ChatBubble「生成方案」跳转简报后，表单字段和蓝色头部文案使用用户输入的对话内容
- Tab「方案生成」从对话入口跳转简报时，表单字段为空字符串，无 mock 默认值
- 蓝色头部（wk-head）内容跟随表单字段实时更新

**Non-Goals:**
- 不改动 ScreenBrief 的受控表单结构
- 不改动蓝色头部的渲染逻辑
- 不改动 handleGeneratePlan / onNavigate 数据传递逻辑
- 不改动 paragraphBriefInput 正则提取规则

## Decisions

### 1. 使用 useEffect 同步 mergedDefaults 到 state（而非条件挂载）

**方案 A（useEffect 同步，选此方案）**：
- 仅改 ScreenBrief.tsx 一个文件
- 新增 useCallback 将所有 setState 封装，在 useEffect 中监听 mergedDefaults
- mergedDefaults 变化时自动同步到所有 state
- useState 仍保留初始值（首次挂载时需要），之后的更新通过 useEffect 驱动

```typescript
const syncFormState = useCallback(() => {
  setBrand(mergedDefaults.brand_name)
  setCategory(mergedDefaults.category)
  setProductMatrix(mergedDefaults.product_matrix)
  setTargetAudience(mergedDefaults.target_audience)
  setMarketingGoal(mergedDefaults.marketing_goal)
  setPeriod(mergedDefaults.period)
  setSelectedCities(mergedDefaults.selected_cities)
  setCoreStrategy(mergedDefaults.core_strategy)
}, [mergedDefaults])

useEffect(() => { syncFormState() }, [syncFormState])
```

**方案 B（MobileWorkbenchPage 条件挂载 ScreenBrief）**：
- 改为 `{screen === 'brief' ? <ScreenBrief /> : null}`，每次切到 brief 屏重新挂载
- 但 ScreenBrief 内部 useMemo 会丢失所有已填写的表单数据（用户修改了某个字段然后切到其他屏再回来会丢失）
- 体验更差

**结论**：方案 A 更精确，只同步 props 外部数据，不干扰用户已输入的修改。

### 2. 无外部数据时使用空字符串默认值

在 `mergedDefaults` 中删除 `'娃哈哈'` / `'果汁饮料'` 等 mock 字符串，改用 `''`。`parseBriefInput` 正则未匹配 + `initialBrandData` 未提供 = 所有字段为空字符串，让用户填写最新消息内容后自动解析填充。

## Risks / Trade-offs

- **[useEffect 循环触发的性能风险]** → mergedDefaults 依赖 `initialInput` / `initialBrandData`，这两个只在导航时变化，用户填表单时不触发，不会导致无谓的 setState 循环。
- **[用户修改字段后被外部数据覆盖]** → 正常情况下只有导航到 brief 屏时触发一次 useEffect。如果用户在 brief 编辑表单后切到其他屏再切回来，mergedDefaults 不变（因为 initialInput / initialBrandData 不变），useEffect 不会覆盖用户的编辑。syncFormState 只在 mergedDefaults 变化时执行。
