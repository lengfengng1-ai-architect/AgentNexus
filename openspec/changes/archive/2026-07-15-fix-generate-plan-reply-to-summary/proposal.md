## Why

当前 `generate_plan` 意图时，LLM 回复为"正在为您生成营销方案，请稍候..."等虚假进度承诺。实际上回复后并未开始生成，用户需要先点击「生成方案」按钮跳转简报页精修，再触发流水线才开始真正生成。LLM 的回复与真实流程脱节，构成"嘴上在生成、手上要你点"的体验断裂。

## What Changes

当 `_normalize_intent_output()` 判定意图为 `generate_plan`（字段齐全）时，不再使用 LLM 的自由回复，而是生成字段摘要作为气泡内容。按钮文案「生成方案」不变。

## Capabilities

### New Capabilities
无新增。

### Modified Capabilities
无修改——`workflow-orchestration` 行为不变，仅修复 reply 生成逻辑。

## Impact

`backend/app/agents/intent_recognition_agent.py` — `_normalize_intent_output()` 的 `generate_plan` 分支约 2 行改动
