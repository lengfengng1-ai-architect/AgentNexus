## 1. 正则兜底函数

- [x] 1.1 新增 `_extract_category_fallback(message, current_category)` 工具函数
  - P1 `属于(.+?)品类` → P2 `品类[是为：:]\s*(.+?)(?=[，。、\n]|$)` 按序匹配
  - 仅 current_category 为 null 时触发，匹配到即 return

- [x] 1.2 在 `run_intent_recognition()` 中，LLM 调用后、_normalize_intent_output 前插入 fallback 调用
- [x] 1.3 在 `stream_intent_recognition()` 中也插入调用

## 2. 验证

- [x] 2.1 "属于 新中式草本茶饮 品类" → "新中式草本茶饮" ✅
- [x] 2.2 "品类是茶饮" → "茶饮" ✅
- [x] 2.3 "品类：功效型护肤" → "功效型护肤" ✅
- [x] 2.4 输入不含品类句式 → 不误触发 ✅
- [x] 2.5 LLM 已提取 category 时 → 不拦截 ✅
- [x] 2.6 句末无终止符 "品类是茶饮" → 前瞻 `(?=[，。、\n]|$)` 兜住 ✅
