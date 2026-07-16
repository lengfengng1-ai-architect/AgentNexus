## Why

LLM 意图识别时，输入显式包含"属于 X 品类"（如"属于 儿童智能教育硬件 品类"），但 LLM 仍漏提取 `category` 字段，导致 intent 判定为 `clarify`（字段缺失），用户体验断裂：字段齐全却反问缺失。

## What Changes

强化 `intent_recognition.md.j2` 中 `category` 的提取规则，增加"属于 X 品类"模式的高优先级匹配。

## Capabilities

### New Capabilities
无新增。

### Modified Capabilities
无修改——`workflow-orchestration` 的意图识别行为不改变，仅在 prompt 层增加提取精度。

## Impact

`backend/app/prompt_templates/intent_recognition.md.j2` — 1 处文案级改动
