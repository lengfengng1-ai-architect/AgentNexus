## Why

当前 `_normalize_intent_output` 中 `clarify` 在 `INDEPENDENT` 元组中且 `if not output.reply` 守卫阻止了缺失字段时 reply 的强制覆盖。结果为：

- LLM 漏提取字段 → intent=clarify
- reply 保持 LLM 原文（"好的，已确认品牌为...，现在为您生成营销方案"等虚假承诺）
- 用户看不到缺失字段反问，不知道缺什么

## What Changes

在 `_normalize_intent_output` 返回前加独立 fallback：`intent == "clarify"` 且有缺失字段时，reply 强制覆盖为反问。

## Capabilities

无色，bugfix。

## Impact

`backend/app/agents/intent_recognition_agent.py` — `_normalize_intent_output()` 返回前约 3 行
