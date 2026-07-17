# Delta: intent-recognition（消费图片 caption 预填生成描述）

## ADDED Requirements

### Requirement: 意图识别 SHALL 利用图片 caption 预填生成描述

当 context 携带 `image_captions`（图片的 VL 描述）时，意图识别 prompt SHALL 渲染「附件图片描述」区块；`text_to_image` / `generate_video` 意图的 `generation_prompt` / `video_prompt` SHALL 结合 caption 与用户文字生成具体描述（用户文字优先，caption 补充主体/颜色/风格信息）。

#### Scenario: 上传跑鞋图并说"生成产品宣传片"
- **GIVEN** 用户上传一张红色跑鞋图片（caption 为"一双红色跑鞋，白底，侧面视角"）
- **AND** 用户输入"帮我生成产品宣传片"
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `generate_video`
- **AND** `video_prompt` SHALL 包含跑鞋主体信息（如"红色跑鞋在灯光下旋转展示，电商广告风格"），而非 null

#### Scenario: 上传产品图选择"电商产品参数介绍图"
- **GIVEN** 用户上传产品图且 context 含 `image_captions`
- **AND** 用户输入"生成电商产品参数介绍图"
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `text_to_image`
- **AND** `generation_prompt` SHALL 结合 caption 中的产品主体信息生成具体描述

#### Scenario: 用户文字与 caption 冲突时以用户文字为准
- **GIVEN** caption 描述为"红色跑鞋"
- **AND** 用户输入"把这双鞋放到海边沙滩上，夕阳风格"
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** `generation_prompt`/`video_prompt` SHALL 以用户指定的场景和风格为主，caption 仅补充主体信息

#### Scenario: 无 caption 时行为不变
- **GIVEN** context 中无 `image_captions`（caption 为 null 或未上传图片）
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 行为与现状一致（从用户文字提取描述，可能为 null）
