## 1. 后处理层修复

- [x] 1.1 `intent_recognition_agent.py`: `_normalize_intent_output()` 的 generate_plan 分支，reply 覆盖为结构化字段摘要，格式：`品牌：{name} · 品类：{category} · 城市：{city} · {budget}万 · {period}个月`

## 2. 验证

- [x] 2.1 字段齐全 → intent=generate_plan → 气泡显示"品牌：肌本律动 · 品类：功效型护肤 · 城市：上海 · 500万 · 4个月"而非"正在为您生成..."
- [x] 2.2 其他意图（market_research / generate_video）不受影响
