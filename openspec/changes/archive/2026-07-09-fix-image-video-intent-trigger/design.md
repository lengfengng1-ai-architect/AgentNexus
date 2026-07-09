## Context

当用户输入"我要生成宣传片""我要生成宣传图"时，意图识别 LLM 当前的 prompt 规则 5/6 要求"没有具体内容描述则归为 chat"，导致 LLM 返回 chat 意图并追问品牌信息，而不是展示 InlineVideoCard/InlineImageCard 的参数选择卡片。

前端 InlineImageCard 和 InlineVideoCard 已经具备了参数填写 → 生成 → 结果展示的完整生命周期，缺的是入口条件。

## Goals / Non-Goals

**Goals:**
- 用户说"生成宣传片/宣传图"等无具体描述的意图词时，直接触发 text_to_video / text_to_image
- 前端展示参数卡片让用户填写（不要求用户一次性提供全部描述）
- InlineImageCard 增加图片尺寸选择功能

**Non-Goals:**
- 不改动 InlineVideoCard 的结构（已支持空 prompt 时的输入 UI）
- 不改动后端生成逻辑

## Decisions

1. **只改 prompt 模板，不改后端逻辑** — 意图识别规则调整本质是 LLM 的分类边界问题，修改 prompt 模板即可解决，无需改动 PromptTemplate → LLM → StructuredOutput 的技术链路。
2. **InlineImageCard 增加本地 state** — prompt 和 size 作为本地 useState，用户在卡片内填写后再提交到后端 `/image/generate`，prompt 从 props（AI 提取的描述）和用户手动编辑合并。
3. **ChatBubble 渲染条件放宽** — 去掉 `generationPrompt.length > 3` 的 guard，因为现在即使没有描述也应该展示参数卡。

## Risks / Trade-offs

- LLM 可能将模糊需求误判为 text_to_image/text_to_video（如"帮我看看这张图"） → 但这类输入在现有规则中本来也容易被误判，且误判后用户看到参数卡可以取消，体验比被追问品牌信息更好
