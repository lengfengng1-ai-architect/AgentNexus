## Why

LLM 在意图识别时对 category 字段的提取行为不稳定——品类名较长或不常见时（如"新中式草本茶饮""儿童智能教育硬件"），即使输入明确包含"属于 X 品类"句式，LLM 仍可能跳过。经过多次 prompt 调优仍未根本解决。

当前已通过后处理层修复了 reply 文案问题（已归档 3 个 change），但 category 提取的根因还在：LLM 输出不可靠时，后端没有任何补救机制。

## What Changes

在 LLM 意图识别输出后、`_normalize_intent_output()` 前，新增一层纯正则的 category fallback。仅当 LLM 输出的 category 为空时才触发，不影响 LLM 成功提取的场景。

两个 pattern 按优先级匹配：

1. `属于(.+?)品类` — 最明确的句式
2. `品类[是为：:]\s*(.+?)(?=[，。、\n]|$)` — 次明确句式，前瞻兜住句末无标点

## Capabilities

### New Capabilities
无新增。

### Modified Capabilities
无修改。
```

## Impact

`backend/app/agents/intent_recognition_agent.py` — 新增 `_extract_category_fallback()` 工具函数，在 `run_intent_recognition` 和 `stream_intent_recognition` 中各插入一次调用，约 20 行
