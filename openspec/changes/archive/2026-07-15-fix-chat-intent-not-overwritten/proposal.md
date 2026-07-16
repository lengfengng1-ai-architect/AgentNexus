## Why

用户发送"你好"等闲聊时，LLM 正确识别为 `chat` intent，但 `_normalize_intent_output` 的 `elif` 分支因 `chat ∉ INDEPENDENT` 将其强制覆盖为 `clarify`，reply 变成 "为了生成营销方案，我还需要了解：brand_name, category, city, budget, period"。

`chat` 和 `query_data` 是独立意图，不应被品牌字段完整性检查覆盖。

## What Changes

将 `chat` 和 `query_data` 加入 `INDEPENDENT` 元组。

## Capabilities

无新增/修改。

## Impact

`backend/app/agents/intent_recognition_agent.py` — `INDEPENDENT` 元组增加两个意图名，约 1 行。
