# intent-recognition Specification

## Purpose
TBD - created by archiving change add-intent-recognition-agent. Update Purpose after archive.
## Requirements
### Requirement: 意图识别 Agent 可以判断用户输入的意图

系统 SHALL 提供一个 `intent_recognition` Agent 节点，接收用户消息和当前上下文，输出用户意图、置信度、直接回复文案、提取的品牌字段、缺失字段和已更新字段。

#### Scenario: 用户想生成营销方案
- **GIVEN** 用户输入 "我是娃哈哈，想在上海推广果汁，预算300万，周期3个月"
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `generate_plan`
- **AND** `brand_input.brand_name` SHALL 为 "娃哈哈"
- **AND** `brand_input.city` SHALL 为 "上海"
- **AND** `missing_fields` SHALL 为空列表

#### Scenario: 用户想查询数据
- **GIVEN** 用户输入 "查询上海的盟域数据"
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `query_data`
- **AND** `brand_input.city` SHALL 为 "上海"
- **AND** `reply` SHALL 非空

#### Scenario: 用户打招呼
- **GIVEN** 用户输入 "你好"
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `chat`
- **AND** `reply` SHALL 为欢迎/能力说明文案

#### Scenario: 信息不完整需要追问（支持多轮对话）
- **GIVEN** 用户输入"我想做营销方案"
- **AND** 当前上下文中 `brand_input` 某些字段为空
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `clarify`
- **AND** `missing_fields` SHALL 包含缺失字段
- **AND** `reply` SHALL 提示缺失字段
- **WHEN** 用户补充信息后再次调用
- **AND** 携带上一轮 `brand_input` 作为上下文
- **THEN** `missing_fields` SHALL 减少或为空

#### Scenario: 用户想生成营销方案（材料齐全时显示确认）
- **GIVEN** 用户输入"我是 Nike，在上海做推广，预算300万，周期3个月"
- **AND** `missing_fields` 为空列表
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `generate_plan`
- **AND** `reply` SHALL 包含确认文案

#### Scenario: 用户想用图片生成视频
- **GIVEN** 用户上传图片附件 + 输入"把这张图做成视频"
- **AND** 上下文中包含 `image_url`
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `generate_video`
- **AND** `image_url` SHALL 从附件元数据提取
- **AND** `video_prompt` SHALL 从用户输入提取
- **AND** `confidence` SHALL ≥ 0.8

#### Scenario: 用户想生成视频但未提供图片
- **GIVEN** 用户输入"帮我生成视频"
- **AND** 未提供图片附件（上下文中无 `image_url`）
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `generate_video`
- **AND** `missing_fields` SHALL 包含 `image_url`
- **AND** `reply` SHALL 询问"请提供需要生成视频的图片"

#### Scenario: 用户想用文字描述生成视频
- **GIVEN** 用户输入"帮我用文字生成一段夕阳海滩的视频"
- **AND** 上下文中不含 `image_url`
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `text_to_video`
- **AND** `generation_prompt` SHALL 从用户输入提取
- **AND** `confidence` SHALL ≥ 0.8

#### Scenario: 用户说"生成一段视频"但未提供具体描述
- **GIVEN** 用户输入"生成一段视频"
- **AND** 输入中不包含具体的场景/主题/风格描述
- **AND** 上下文中不含 `image_url`
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `chat`
- **AND** `reply` SHALL 询问用户希望生成什么样的视频

#### Scenario: 用户想用文字描述生成图片
- **GIVEN** 用户输入"帮我画一张赛博朋克风格的海报"
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `text_to_image`
- **AND** `generation_prompt` SHALL 从用户输入提取
- **AND** `confidence` SHALL ≥ 0.8

#### Scenario: 用户说"我要生成图片"但未提供具体描述
- **GIVEN** 用户输入"我要生成图片"
- **AND** 输入中不包含具体的场景/主题/风格描述
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `chat`
- **AND** `reply` SHALL 询问用户希望生成什么样的图片

#### Scenario: 用户修改已有上下文
- **GIVEN** 当前上下文中 `brand_input.city` 为 "上海"
- **AND** 用户输入 "改成北京"
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `update_context`
- **AND** `updated_fields` SHALL 包含 `city: "北京"`
- **AND** `brand_input.city` SHALL 为 "北京"

#### Scenario: 用户上传图片且未输入文字
- **GIVEN** 用户上传图片附件
- **AND** 用户未输入文字消息
- **AND** 上下文中包含 `image_urls`
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `clarify`
- **AND** `missing_fields` SHALL 为空列表
- **AND** `reply` SHALL 反问用户想生成哪种内容（电商产品参数介绍图 / 好看的宣传图 / 产品宣传短片）
- **AND** `confidence` SHALL ≥ 0.8

#### Scenario: 用户上传图片并要求以图生图
- **GIVEN** 用户上传图片附件
- **AND** 用户输入"基于这张图生成海报"
- **AND** 上下文中包含 `image_urls`
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `text_to_image`
- **AND** `image_url` SHALL 从附件元数据回填
- **AND** `generation_prompt` SHALL 从用户输入提取
- **AND** `confidence` SHALL ≥ 0.8

### Requirement: 意图识别输出使用统一结构化 Schema

系统 SHALL 使用 Pydantic schema `IntentRecognitionOutput` 约束 `intent_recognition` 节点的输出，字段包括 `intent`、`confidence`、`reply`、`brand_input`、`missing_fields`、`updated_fields`。

#### Scenario: 输出结构校验
- **WHEN** `intent_recognition` 节点返回结果
- **THEN** 结果 SHALL 能通过 `IntentRecognitionOutput` 校验
- **AND** `intent` SHALL 为 `generate_plan`、`query_data`、`chat`、`clarify`、`update_context`、`generate_video`、`text_to_video`、`text_to_image` 之一
- **AND** `confidence` SHALL 在 0.0 到 1.0 之间

### Requirement: 意图识别 Prompt 模板使用 Jinja2 且不可运行时自修改

系统 SHALL 将 `intent_recognition` 的 prompt 放在 `backend/app/prompt_templates/intent_recognition.md.j2`，使用 Jinja2 渲染，禁止在运行时拼接或自修改 prompt。

#### Scenario: Prompt 模板渲染
- **GIVEN** 模板包含变量 `message` 和 `context`
- **WHEN** 调用渲染函数并传入参数
- **THEN** 系统 SHALL 返回完整 prompt 字符串
- **AND** prompt 中 SHALL 包含用户输入消息

### Requirement: 系统 SHALL 支持多轮对话补全品牌信息

当 intent 为 `clarify` 时，前端 SHALL 显示 agent 的追问文案，用户继续输入后 SHALL 携带已积累的 brand_input 重新调用 `/chat/stream`，在此次上下文中更新品牌信息，直到 intent 变为 `generate_plan`。

#### Scenario: 用户先发"我想做方案"再补充信息
- **WHEN** 用户发送"我想做方案"
- **THEN** `intent_recognition` SHALL 返回 `intent: "clarify"`，`missing_fields` 包含缺失字段
- **WHEN** 用户继续输入"我是 Nike，在上海做推广，预算 300 万，周期 3 个月"
- **AND** 调用时携带上一轮 `brand_input` 作为上下文
- **THEN** `intent_recognition` SHALL 返回 `intent: "generate_plan"`
- **AND** 前端显示"确认生成方案"卡片

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

