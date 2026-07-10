## Context

移动端①对话入口屏当前输入条布局：
- `.quick-btns`: [填写简报] [语音输入] [附件] [方案模板]
- `.inputbar-row`: [ input ][↑]

"填写简报"点击后跳转到②简报屏，但简报表单内容全是硬编码 mock 数据，无法利用对话框中的用户输入进行预填。

## Goals / Non-Goals

**Goals:**
- 从 `.quick-btns` 中删除"语音输入"文字按钮
- 在 `.inputbar-row` 中 input 与 ↑ 之间新增圆形 mic 按钮（SVG 简笔线条图标）
- "填写简报"按钮点击时携带 ScreenChat 的 `inputValue` 文本
- ScreenBrief 挂载时解析输入文本，预填对应的表单字段

**Non-Goals:**
- 不做 NLP 或 LLM 解析提取（仅按方案模板格式做正则匹配）
- 不改动后端
- 不改动桌面端

## Decisions

### 1. 语音按钮布局：input 与 ↑ 之间

选定在 `.inputbar-row` 中 input 与 ↑ 之间插入圆形 mic 按钮，尺寸与 ↑ 一致（38×38）。SVG path 画简笔 mic 线条，`stroke: var(--muted)`，点击触发 `handleVoice`。

### 2. onNavigate 签名扩展

ScreenChat 的 `onNavigate` 回调签名从 `(screen: MobileScreen) => void` 改为 `(screen: MobileScreen, inputText?: string) => void`。当 `screen === 'brief'` 时传入 `inputValue`。

MobileWorkbenchPage 的 `onNavigate` 回调接收后暂存到 `pendingBriefInput` state，渲染 ScreenBrief 时作为 prop 传入。

```
ScreenChat ──onNavigate('brief', inputValue)──→ MobileWorkbenchPage
                                                    │ pendingBriefInput
                                                    ↓
                                               ScreenBrief(initialInput)
```

### 3. 解析策略：正则提取方案模板字段

方案模板格式：`我是 [品牌名]，属于 [品类]，想在 [城市] 做活动，预算 [金额] 万，周期 [时长] 个月`

| 正则匹配 | 表单字段 | 目的 |
|---|---|---|
| `我是 (.+?)[，,属于]` | 品牌 | 提取品牌名 |
| `属于 (.+?)[，,想在]` | 产品线 | 提取品类 |
| `想在 (.+?)[做搞]` | 首批城市 | 提取城市名（支持"北京上海"、"北京/上海"、"北京、上海"多城市格式拆分） |
| `预算 [约]?(\d+[万k]?)` | 营销目标 | 提取预算金额 |
| `周期 [约]?(\d+[个月年]?)` | 投放周期 | 提取时长 |

未命中模板格式时，整段文本填入核心策略字段。

### 4. ScreenBrief 表单状态从 defaultValue 改为 state

当前表单使用 `defaultValue` 硬编码，修改后使用 `useState` 初始化。挂载时如果 `initialInput` 非空，调用 `parseInput(input)` 返回解析结果，覆盖对应字段的初始值。

## Risks / Trade-offs

- **[解析精度低]** 正则只匹配固定模板格式，用户自由输入时很可能匹配失败。→ MVP 阶段的 trade-off，未来升级可引入 LLM 解析
- **[表单状态管理]** 从 `defaultValue` 改为 `useState` 可能引入受控组件差异。→ 保持现有 `<input>` 模式不变，仅把 `defaultValue` 改为 `value`+`onChange`
