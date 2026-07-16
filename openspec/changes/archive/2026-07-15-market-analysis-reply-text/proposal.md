## Why

后端 intent_recognition prompt 中 `market_research` 字段齐全时要求 LLM 回复「请点击"开始分析"按钮」，但前端已改为自动触发，不再有按钮。回复文案与实际交互逻辑不匹配，用户看到"请点击"会困惑。

## What Changes

- `backend/app/prompt_templates/intent_recognition.md.j2` — `market_research` 字段齐全时的 reply 文案改为「正在进行分析…」

## Impact

- 后端 prompt 一行文案改动，不影响逻辑
