## Context

`intent_recognition.md.j2:102` 当前提取 category 的规则为：

```
- 品类从产品词（运动鞋/运动服饰/果汁/饮料等）、"XX品类"或上下文中提取
```

规则太泛，LLM 在处理"属于 X 品类"这样显式模式时仍可能跳过。

## Goals / Non-Goals

**Goals:**
- 输入含"属于 X 品类"或"X 品类"时，LLM 100% 提取 category = X

**Non-Goals:**
- 不改变其他字段的提取逻辑
- 不改后处理代码

## Decisions

将品类提取规则拆为优先级两层：

```
1. （最高优先级）"属于 X 品类"或"X 品类" → category = X，禁止跳过
2. 其次从产品词、上下文推断
```

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| LLM 可能把非品类字段匹配为"X 品类" | 模式很具体（"品类"后缀），误匹配概率低。且 category 只影响 clarify/generate_plan 判定，不会导致错误操作 |
