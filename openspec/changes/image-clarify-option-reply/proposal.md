# Proposal: image-clarify-option-reply

## Why

用户上传图片后 AI 反问三个选项（①电商参数图 ②宣传图 ③宣传短片），但用户只回序号（"3"、"①"、"选1"）时意图识别没有对应规则——序号可能被误读为预算/周期数字（规则 1），或落回 chat 泛泛回复。期望：回 "3" 即直接分流到 generate_video 并结合 caption 预填宣传短片描述。

## What Changes

- `intent_recognition.md.j2` 新增「序号快捷回复」规则：上一轮 AI 是图片选项反问时，用户仅输入序号（"1/2/3"、"①②③"、"选N"、"第N个"）直接分流：
  - ① → `text_to_image`，generation_prompt 结合 image_captions 生成**电商产品参数介绍图**描述（白底/浅色、参数标签版式、卖点布局）
  - ② → `text_to_image`，generation_prompt 结合 image_captions 生成**宣传海报**描述（氛围感、视觉冲击）
  - ③ → `generate_video`，image_url 取第一张图，video_prompt 结合 image_captions 生成**宣传短片**描述
  - 序号识别优先于规则 1 的数字字段提取；无效序号（如 "4"）回退 clarify 重问
  - 分流后 reply 为简短确认语（不含虚假承诺）
- 纯模板规则改动，无代码逻辑变更（normalize 的 caption 预填、image_url 回填已有）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `intent-recognition`: 新增「图片选项反问后的序号快捷回复」行为要求

## Impact

- **改动文件**：`backend/app/prompt_templates/intent_recognition.md.j2`（模板规则）、`backend/tests/test_agents/test_intent_recognition.py`（渲染断言测试）
- **in_scope**：intent-recognition 既有能力的规则补全
- **后端 API / 前端**：无改动
- **mock 数据**：不涉及
- **Prompt 文案**：序号分流规则措辞属于业务规则，Review 时可由人改写

## Non-goals

- 不改 normalize 代码逻辑（B 方案硬编码拦截作为后续加固选项，本次不做）
- 不支持序号以外的选项指代（如"做第二个那种"，由 LLM 语义理解自然覆盖，不写专门规则）
- 不涉及 out_scope 能力
