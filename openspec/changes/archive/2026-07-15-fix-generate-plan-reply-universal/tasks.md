## 1. 后处理层补漏

- [x] 1.1 `intent_recognition_agent.py`: `_normalize_intent_output()` 返回前加 `if output.intent == "generate_plan"`，reply 无条件覆盖为字段摘要

## 2. 验证

- [x] 2.1 LLM 直接返回 generate_plan → reply 被覆盖为"品牌：肌本律动 · 品类：功效型护肤 · 城市：上海 · 500万 · 4个月"而非"正在为您生成..."
- [x] 2.2 LLM 返回 clarify 后被修正为 generate_plan → reply 同样被摘要覆盖
- [x] 2.3 其他意图（market_research / clarify）不受影响
