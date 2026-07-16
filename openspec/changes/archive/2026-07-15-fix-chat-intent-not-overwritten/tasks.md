## 1. Bugfix

- [ ] 1.1 `_normalize_intent_output`: `INDEPENDENT` 元组中加入 `"chat"` 和 `"query_data"`

## 2. 验证

- [ ] 2.1 输入"你好" → intent 保持 chat，reply 为 LLM 原文
- [ ] 2.2 generate_plan 的字段摘要覆盖不受影响
- [ ] 2.3 clarify 的 fallback 覆盖不受影响
- [ ] 2.4 字段齐全的正常流程不受影响
