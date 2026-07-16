## Context

`_normalize_intent_output()` 当前的 generate_plan reply 覆盖在 `if` 条件内，仅命中"LLM 返回非 generate_plan 后被修正"的路径。当 LLM 直接返回 `generate_plan` 时，条件不满足，reply 保持 LLM 原文。

## Goals / Non-Goals

**Goals:**
- 无论 LLM 如何返回，只要最终意图为 `generate_plan`，reply 必为字段摘要

**Non-Goals:**
- 不改变意图判定逻辑
- 不增加数据依赖

## Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| 覆盖时机 | 在完整的 normalize 逻辑执行完后，对 entry 进行一次统一的后处理 | 消除两条路径的分歧，后端单一出口 |

具体改动：在 `_normalize_intent_output` 返回前，加一个独立的 `if output.intent == "generate_plan"` 判断，无条件覆盖 reply 为字段摘要。

## Risks / Trade-offs

无——这是对已归档 change `fix-generate-plan-reply-to-summary` 的补充，逻辑一致，只是扩大了覆盖范围。
