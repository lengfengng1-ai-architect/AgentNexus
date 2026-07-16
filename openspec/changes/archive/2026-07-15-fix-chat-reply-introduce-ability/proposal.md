## Why

用户打招呼时，LLM 回复"你好！请问有什么可以帮助您的？"过于泛化，没有告知用户系统的能力范围。用户不知道可以做什么，需要引导。

## What Changes

`intent_recognition.md.j2` 中 chat 规则增加 reply 引导，要求 LLM 在回复中简要介绍自身能力：生成营销方案、市场分析、生成海报/视频等。

## Capabilities

无新增/修改。

## Impact

`backend/app/prompt_templates/intent_recognition.md.j2` — chat 规则约 3 行文案改动
