## Why

`_normalize_intent_output()` 在 LLM 返回 `clarify` + 字段缺失时，因 `clarify` 在 `INDEPENDENT` 元组中被跳过修正，且 `if not output.reply` 守卫阻止了 reply 的强制覆盖。结果是：

1. intent=clarify → ChatBubble 不渲染「生成方案」按钮 ✓（按理是对的）
2. reply 保持 LLM 输出的"正在为您生成营销方案..." → 用户看不到缺失字段反问 ✗

用户体验断裂：字段缺失但没收到反问，不知道缺什么，也没有继续填的入口。

## What Changes

1. 将 `clarify` 从 `INDEPENDENT` 元组中移除
2. 去除 `elif` 分支中 `if not output.reply` 守卫，使 clarify+missing_fields 时 reply 无条件覆盖为反问

两个改动都在 `_normalize_intent_output()` 中，共约 2 行。

## Capabilities

### New Capabilities
无新增。

### Modified Capabilities
无修改——`workflow-orchestration`（意图识别）的行为不变，仅在 clarify 输出层加强了 reply 校正。

## Impact

`backend/app/agents/intent_recognition_agent.py` — `_normalize_intent_output()` 函数内 2 行改动
