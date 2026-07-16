## Context

`_normalize_intent_output` 的 `elif` 分支：

```python
elif missing and output.intent not in INDEPENDENT:
    output.intent = "clarify"
    if not output.reply:
        output.reply = f"为了生成营销方案，我还需要了解：{', '.join(missing)}"
```

`INDEPENDENT` 当前为 `("clarify", "update_context", "generate_video", "text_to_video", "text_to_image", "market_research")`。

`chat` 和 `query_data` 是两个纯粹的独立意图——既不需要品牌字段，也不应该被字段检查干扰。缺少它们导致了"你好 → 5个字段全缺 → intent 强制被改为 clarify"的错误流程。

## Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| 加什么 | `"chat", "query_data"` | 两者都是独立意图，LLM 自己就能正确识别，不应被后处理覆盖 |
| 不影响什么 | `generate_plan` 摘要、`clarify` fallback 等统一后处理 | 这些在 `elif` 之后，不依赖 `INDEPENDENT` 判定 |

改动后 `elif` 分支：`chat/query_data` 在 `INDEPENDENT` 中 → 跳过 → 保持 LLM 原始输出。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| LLM 误判为 chat 但实际要生成方案 | LLM 判定 `chat` 的阈值已在 prompt 中设得很高（10. 以上都不匹配时，才是闲聊）。且用户如果真需要方案，下一条消息会走正常意图识别 |
