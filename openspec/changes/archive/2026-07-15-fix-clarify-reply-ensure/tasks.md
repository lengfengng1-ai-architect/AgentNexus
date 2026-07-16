## 1. 后处理层补漏

- [x] 1.1 `_normalize_intent_output()` 返回前加独立 fallback：`if output.intent == "clarify" and missing` → reply 强制覆盖为缺失字段反问

## 2. 验证

- [x] 2.1 LLM 返回 clarify + 缺 category → reply 显示"为了生成营销方案，我还需要了解：category"
- [x] 2.2 generate_plan 的摘要覆盖不受影响
- [x] 2.3 market_research / generate_video 不受影响
