# 图片澄清反问的序号快捷回复（探索草稿）

> 本文档为 brainstorming 产出的设计探索草稿，**不是正式 API 契约**。

## 背景与问题

用户上传图片后，AI 反问：
```
收到图片！想让我帮你生成哪种内容？
① 电商产品参数介绍图
② 好看的宣传图
③ 产品宣传短片
或者直接说出你的想法，我来帮你实现。
```

当用户只回一个序号（"3"、"1"、"②"、"选3"）时，期望直接分流到对应意图；但当前意图识别规则没有教 LLM 处理「上文是选项反问 + 当前只回序号」的模式，序号可能被误读（规则 1 甚至会把"10万"这类数字当预算）。

## 现状约束

- 反问文案由 `_normalize_intent_output` 的图片澄清分支硬编码生成（intent_recognition_agent.py），模板规则 40-42 行处理"空消息+图"
- conversation_history 已在 prompt 中（最近 10 轮），LLM 能看到上一条反问
- caption 预填链路刚上线：序号分流后 video_prompt/generation_prompt 应结合 caption 预填
- 选项语义：① 电商产品参数介绍图（text_to_image，电商详情页风格）② 好看的宣传图（text_to_image，海报风格）③ 产品宣传短片（generate_video）

## 设计方向

### A. 模板规则补充（主方案，推荐）

在 `intent_recognition.md.j2` 的图片澄清规则后追加「序号快捷回复」规则：

```
当上一轮 AI 回复是图片选项反问（包含"① 电商产品参数介绍图 ② 好看的宣传图 ③ 产品宣传短片"），
用户仅输入序号（"1"/"2"/"3"、"①"/"②"/"③"、"选1"、"第一个"等）时：
- ① → text_to_image，generation_prompt 结合 image_captions 生成电商产品参数介绍图描述
  （白底/浅色背景、参数标签版式、卖点文案布局）
- ② → text_to_image，generation_prompt 结合 image_captions 生成好看的宣传海报描述
  （氛围感、视觉冲击、品牌调性）
- ③ → generate_video，image_url 取第一张图，video_prompt 结合 image_captions 生成宣传短片描述
序号识别优先于规则 1 的数字字段提取（此场景下"3"不是预算/周期）。
```

LLM 有 conversation_history + 该规则即可正确分流，无需改代码逻辑（normalize 已有 caption 预填和 image_url 回填）。

### B. 后端 normalize 硬编码拦截（备选）

`_normalize_intent_output` 检测「message 是纯序号 + 上一轮是图片反问 + image_urls 非空」时强制改写 intent。

- 优点：确定性 100%，不依赖 LLM
- 缺点：需要在 agent 里读 conversation_history 判断"上一轮是否图片反问"（目前 normalize 只拿 output + image_urls，要新增参数）；序号→意图映射硬编码进代码，选项文案改动时两处同步

### 推荐 A

模板规则已承担此类引导职责（"空消息+图→clarify 反问"就是模板规则），序号分流是它的自然延续，一处改动；配合现有测试基建（_load_system_prompt 渲染断言 + LLM 行为抽查）可验证。B 作为 A 失效时的加固可后续再加。

### 配套调整

- 序号 ①② 的 generation_prompt 风格词差异（参数图 vs 宣传海报）写进规则，让 LLM 预填即带正确方向
- 测试：模板渲染包含序号规则；normalize 已有 caption 预填测试不受影响；可加 LLM 集成测试（如已有 pattern）验证 "3" → generate_video

## 待澄清（进 explore 确认）

1. 序号格式支持范围：仅 "1/2/3" 还是包括 "①②③"、"选1"、"第一个"？——倾向：常见形式全覆盖（规则里列举，LLM 语义判断兜底）
2. 序号分流后是否需要 reply 确认语？——倾向：reply 简短确认（"好的，为你生成产品宣传短片："），卡片即参数面板
3. 用户输 "4" 或无效序号 → 回退 clarify 重问？——倾向：是，按无效选择处理
