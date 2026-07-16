## Context

`_normalize_intent_output()` 当前对 clarify 的 reply 处理存在漏洞：

1. `clarify ∈ INDEPENDENT` → 主 `elif` 分支跳过
2. `if not output.reply` guard → LLM 回复非空时跳过

两个条件都防住了覆盖，需要独立 fallback。

## Goals / Non-Goals

**Goals:**
- clarify + missing_fields ≠ ∅ → reply 必为"为了生成营销方案，我还需要了解：{fields}"

**Non-Goals:**
- 不修改 INDEPENDENT 元组
- 不修改现有 elif 逻辑
- 不修改其他意图

## Decisions

与 `generate_plan` 后处理同一模式：在 `_normalize_intent_output` 返回前加独立判断。

```python
if output.intent == "clarify" and missing:
    output.reply = f"为了生成营销方案，我还需要了解：{', '.join(missing)}"
```

## Risks / Trade-offs

无——与 generate_plan 的修法完全一致，独立逻辑不影响其他意图。
