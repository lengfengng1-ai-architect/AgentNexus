## Context

意图识别的 prompt 模板规则 5（text_to_video）和规则 6（text_to_image）当前仅关注"用户想要生成视频/图片"这个意图本身，未校验用户是否提供了具体的生成内容描述。当用户输入"我要生成图片"时，LLM 输出 `text_to_image` 并提取"我要生成图片"作为 `generation_prompt`，导致图片生成页使用无效提示词。

## Goals / Non-Goals

**Goals:**
- 用户只说"生成图片"或"生成视频"但没有提供具体描述时，LLM 归为 `chat` 并反问
- 用户提供了具体描述（如"赛博朋克海报"）时，正常触发 `text_to_image` / `text_to_video`
- 新增测试覆盖边界情况

**Non-Goals:**
- 不修改 LLM 输出结构（generation_prompt 等字段不变）
- 不修改前端逻辑
- 不修改 normalize 函数逻辑
- 不修改 intent.yaml

## Decisions

- **改动点最小化**：仅修改 `intent_recognition.md.j2` 的规则 5 和 6 的文案描述，通过 LLM 自身理解能力来筛选"有具体描述 vs 无具体描述"的场景，不需要新增代码逻辑
- **无需修改 normalizer**：`_normalize_intent_output` 中 text_to_video 和 text_to_image 已在 INDEPENDENT 列表中，不会被 normalize 成 clarify，改动后的 LLM 输出 chat 即可正常流转

## Risks / Trade-offs

- [低风险] LLM 对"是否有具体描述"的判断可能不一致 → 通过测试用例覆盖典型边界
- [低风险] 用户可能用非常模糊的描述（如"好看的东西"）→ 不作为边界处理，当前目的是拦截完全无描述的情况
