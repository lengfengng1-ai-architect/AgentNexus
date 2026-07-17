# Delta: intent-recognition（序号快捷回复分流）

## ADDED Requirements

### Requirement: 图片选项反问后的序号回复 SHALL 直接分流到对应生成意图

当上一轮 AI 回复是图片选项反问（①电商产品参数介绍图 ②好看的宣传图 ③产品宣传短片）且上下文中包含 `image_urls` 时，用户仅输入序号 SHALL 被识别为对应生成意图，而非预算/周期数字或闲聊。序号形式 SHALL 覆盖 "1/2/3"、"①②③"、"选N"、"第N个" 等常见表达。无效序号（超出 ①-③ 范围）SHALL 回退 `clarify` 重问。

#### Scenario: 用户回复 "3"
- **GIVEN** 上一轮 AI 回复为图片选项反问
- **AND** 上下文中包含 `image_urls`
- **WHEN** 用户输入 "3"
- **THEN** 输出 `intent` SHALL 为 `generate_video`
- **AND** `image_url` SHALL 为第一张图片 URL
- **AND** `video_prompt` SHALL 非 null：优先由 LLM 结合 `image_captions` 生成宣传短片描述；LLM 未产出时由 normalize 基于 `image_captions[0]` 回填默认文案（无 caption 时保持 null，行为不变）
- **AND** `reply` SHALL 为简短确认语

#### Scenario: 用户回复 "①"
- **GIVEN** 上一轮 AI 回复为图片选项反问
- **WHEN** 用户输入 "①"
- **THEN** 输出 `intent` SHALL 为 `text_to_image`
- **AND** `generation_prompt` SHALL 结合 `image_captions` 生成电商产品参数介绍图描述（白底/浅色背景、参数标签版式、卖点文案布局方向）

#### Scenario: 用户回复 "选2"
- **GIVEN** 上一轮 AI 回复为图片选项反问
- **WHEN** 用户输入 "选2"
- **THEN** 输出 `intent` SHALL 为 `text_to_image`
- **AND** `generation_prompt` SHALL 结合 `image_captions` 生成宣传海报描述（氛围感、视觉冲击方向）

#### Scenario: 序号优先于数字字段提取
- **GIVEN** 上一轮 AI 回复为图片选项反问
- **WHEN** 用户输入 "3"
- **THEN** "3" SHALL NOT 被提取为预算或周期字段

#### Scenario: 无效序号回退
- **GIVEN** 上一轮 AI 回复为图片选项反问
- **WHEN** 用户输入 "4"
- **THEN** 输出 `intent` SHALL 为 `clarify`
- **AND** `reply` SHALL 引导用户重新选择 ①-③ 或说出想法

#### Scenario: 非反问上下文中的序号行为不变
- **GIVEN** 上一轮 AI 回复不是图片选项反问
- **WHEN** 用户输入 "3"
- **THEN** 按现有规则处理（可能为周期等字段提取或闲聊），不受本规则影响
