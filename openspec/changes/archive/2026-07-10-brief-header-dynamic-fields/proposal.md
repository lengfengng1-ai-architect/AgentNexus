## Why

② 简报屏的 wk-head 上半部分（品牌标题、产品线、规格/价格/周期元数据）使用了大量固定字符串，不反映用户在表单中填入的真实数据。同时「目标人群」select 选项 "25-35岁 一线白领" 带了多余的地域描述，用户希望只保留年龄。

## What Changes

- wk-head 的固定文案全部替换为表单 state 驱动：`{brand} · {category}`、`{productMatrix}`、品类/预算/周期元数据
- "目标人群" select 选项 "25-35岁 一线白领" → "25-35岁"
- 其他四个选项不变

## Capabilities

### New Capabilities

无

### Modified Capabilities

- `mobile-workbench-preview`: wk-head 从固定字符串改为表单数据驱动；目标人群选项精简

## Impact

- `frontend/src/pages/mobile-workbench/ScreenBrief.tsx` — 修改 wk-head JSX、修改 select option
