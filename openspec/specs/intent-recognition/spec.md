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
- **AND** `intent` SHALL 为 `generate_plan`、`query_data`、`chat`、`clarify`、`update_context`、`generate_video`、`text_to_video`、`text_to_image`、`activity_planning`、`budget_assessment`、`alliance_planning` 之一
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

### Requirement: 意图识别 SHALL 支持 budget_assessment 意图

意图识别 SHALL 新增 `budget_assessment` 意图，当用户消息含"预算评估/预算分配/预算分析"等关键词且意图为评估预算（而非生成完整方案）时返回该意图。budget_assessment SHALL 复用现有 clarify 多轮机制收集 category/budget/period/city 四字段；字段齐全时返回 budget_assessment（而非 generate_plan）。

#### Scenario: 预算评估关键词触发 budget_assessment
- **GIVEN** 用户消息含"预算评估"等关键词
- **WHEN** 意图识别处理
- **AND** category/budget/period/city 四字段齐全
- **THEN** intent SHALL 为 budget_assessment

#### Scenario: 字段缺失走 clarify 收集
- **GIVEN** 用户触发预算评估但字段缺失
- **WHEN** 意图识别处理
- **THEN** intent SHALL 为 clarify
- **AND** missing_fields SHALL 包含缺失的 budget 评估字段

#### Scenario: 与 generate_plan 区分
- **GIVEN** 用户请求完整方案（非预算评估关键词）
- **WHEN** 意图识别处理
- **AND** 五字段齐全
- **THEN** intent SHALL 为 generate_plan（不受 budget_assessment 影响）

### Requirement: 意图识别 SHALL 支持 activity_planning 意图与 sport_type 字段

意图识别 SHALL 新增 `activity_planning` 意图（关键词"创建活动/策划活动/办活动/做活动"）。SHALL 新增 `sport_type` 字段（LLM 从用户输入提取运动类型）。字段齐全（sport_type + city）→ activity_planning；缺 → 保持意图 + 反问。完整方案请求仍走 generate_plan。

#### Scenario: 活动关键词触发 activity_planning
- **GIVEN** 用户消息含"创建活动"等关键词
- **WHEN** 意图识别且 sport_type + city 齐全
- **THEN** intent SHALL 为 activity_planning

#### Scenario: sport_type 由 LLM 提取
- **GIVEN** 用户消息含运动类型描述
- **WHEN** 意图识别
- **THEN** sport_type SHALL 由 LLM 提取（如"羽毛球"）
- **AND** sport_type SHALL 随 intent 输出返回

#### Scenario: 字段缺失走多轮反问
- **GIVEN** 触发活动规划但 sport_type 或 city 缺失
- **WHEN** 意图识别
- **THEN** intent SHALL 为 activity_planning
- **AND** missing_fields SHALL 标记缺失项

#### Scenario: 与 generate_plan 区分
- **GIVEN** 用户请求完整营销方案（非活动关键词）
- **WHEN** 五字段齐全
- **THEN** intent SHALL 为 generate_plan（不受 activity_planning 影响）

### Requirement: 意图识别 SHALL 支持 alliance_planning 意图

意图识别 SHALL 新增 `alliance_planning` 意图（关键词"创建盟域/盟域合作/建盟域/加入盟域"）。字段齐全（category + city）→ alliance_planning；缺 → 保持意图 + 反问。完整方案请求仍走 generate_plan。

#### Scenario: 盟域关键词触发
- **GIVEN** 用户消息含"创建盟域"等关键词且 category+city 齐全
- **THEN** intent SHALL 为 alliance_planning

#### Scenario: 字段缺失走多轮反问
- **GIVEN** 触发盟域规划但 category 或 city 缺失
- **THEN** intent SHALL 为 alliance_planning
- **AND** missing_fields SHALL 标记缺失项

#### Scenario: 与 generate_plan 区分
- **GIVEN** 用户请求完整方案（非盟域关键词）
- **WHEN** 五字段齐全
- **THEN** intent SHALL 为 generate_plan

