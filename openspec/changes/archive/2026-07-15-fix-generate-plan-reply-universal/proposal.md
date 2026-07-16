## Why

前一次 change `fix-generate-plan-reply-to-summary` 将 `_normalize_intent_output` 中 LLM 被修正为 `generate_plan` 时的 reply 改为字段摘要。

但该修复仅覆盖了 LLM 被修正的场景（LLM 返回 `clarify` 后修正为 `generate_plan`），未覆盖 LLM **直接正确返回 `generate_plan`** 的场景。后者 reply 仍为 LLM 自由输出的"好的，正在为您生成..."，与按钮形成冗余。

## What Changes

将 generate_plan 的 reply 覆盖逻辑从 `if` 条件中提取为独立逻辑，同时覆盖两种场景：
1. LLM 返回非 generate_plan 被修正为 generate_plan
2. LLM 直接返回 generate_plan

共 1 处改动，约 3 行。

## Capabilities

### New Capabilities
无

### Modified Capabilities
无

## Impact

`backend/app/agents/intent_recognition_agent.py` — `_normalize_intent_output()` 约 3 行改动
