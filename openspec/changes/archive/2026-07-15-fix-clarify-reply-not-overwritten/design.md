## Context

`_normalize_intent_output()` 位于 `intent_recognition_agent.py:98`，作用是在 LLM 意图识别输出后强制执行"字段完整性→意图"的规则（有缺失→clarify、完整→generate_plan）。

当前代码结构：

```python
INDEPENDENT = ("clarify", "update_context", "generate_video", "text_to_video", "text_to_image", "market_research")

if not missing:
    # 修正为 generate_plan
elif missing and intent not in INDEPENDENT:
    # 修正为 clarify 并覆盖 reply
    # → clarify 在 INDEPENDENT 中，这里永远不会走到
```

bug：intent=clarify + missing_fields ≠ ∅ 时，`elif` 跳过，reply 保持 LLM 的原始输出。
同时 `if not output.reply` 守卫阻止了 reply 修正（LLM 的 reply 字段永远非空字符串）。

## Goals / Non-Goals

**Goals:**
- intent=clarify + 字段缺失 → reply 必为缺失字段反问

**Non-Goals:**
- 不改变其他意图的 reply 行为
- 不改变 generate_plan/clarify 的判定逻辑

## Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| `clarify` 是否在 INDEPENDENT | 从中移除 | clarify 不是独立意图，它的 reply 应在有缺失时强制覆盖 |
| reply 覆盖是否加 guard | 不加 | LLM 的 clarify reply 在 missing 时不可信，应无条件覆盖 |

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| LLM 有时会比模板反问更自然温和 | 方案 A 已接受此代价。LLM 的"好的，您还没有提供预算…"确实更温和，但 clarify 意味着用户缺少填写指导，模板反问的优势是确定性——用户总是知道缺了什么 |
