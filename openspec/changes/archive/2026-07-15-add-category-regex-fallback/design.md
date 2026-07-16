## Context

意图识别流程：

```
用户输入 → LLM(with_structured_output) → _normalize_intent_output → 返回
                                          ↑
                                  LLM 输出中 category 可能为空
                                  后端无任何补救
```

期望的是：

```
用户输入 → LLM(with_structured_output) → 正则 fallback → _normalize_intent_output → 返回
                                          ↑
                                  category 为空时才触发
                                  只兜底，不抢 LLM 优先级
```

## Goals / Non-Goals

**Goals:**
- LLM 没提取 category 时，用正则从原始输入中提取
- 只兜底，不抢 LLM 优先级
- 覆盖当前 prompt 调优仍失败的场景（"属于 儿童智能教育硬件 品类"等）

**Non-Goals:**
- 不修改 LLM prompt
- 不修改 _normalize_intent_output 逻辑
- 不修改其他字段提取

## Decisions

### Pattern 设计

| Pattern | 规则 | 示例 |
|---------|------|------|
| P1 | `属于(.+?)品类` | "属于 儿童智能教育硬件 品类" → "儿童智能教育硬件" |
| P2 | `品类[是为：:]\s*(.+?)(?=[，。、\n]\|$)` | "品类是茶饮" → "茶饮"；"品类：功效型护肤" → "功效型护肤" |

P3 (`(.+?)品类`) 经审查删除——无起始锚点的非贪婪匹配会导致误提取。

### 触发条件

```python
if output.brand_input.category is None:
    for pattern in PATTERNS:
        m = re.search(pattern, raw_message)
        if m:
            output.brand_input.category = m.group(1).strip()
            break
```

仅当 LLM 输出中 `category` 为 null 时触发匹配。匹配成功后立即 break，不继续走更低优先级的 pattern。

### 放置位置

`_load_system_prompt` 不涉及。在 `run_intent_recognition` 和 `stream_intent_recognition` 中的 LLM 调用之后、`_normalize_intent_output` 之前插入。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 正则误匹配 | P1 句式非常明确（"属于……品类"），误匹配概率极低。P2 有终止符前瞻 + 仅在 category 为空时触发 |
| 正则与 LLM 提取不一致 | 不影响 LLM 成功提取的场景。正则输入是原始 `message`，与 LLM 看到的同一份 |
| 品牌名中含"品类" | 如"茶叶品类创新品牌"——P1 `属于(.+?)品类` 会匹配"茶叶品类创新品牌"而非"茶叶"。但这样 category 错也比空好，用户可以在后续对话中修正（update_context） |
