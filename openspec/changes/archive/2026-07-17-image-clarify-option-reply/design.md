# Design: image-clarify-option-reply

## Context

图片澄清反问（①②③）由 `_normalize_intent_output` 硬编码生成；意图识别模板已有「空消息+图→clarify 反问」规则，但没有「用户回序号→分流」规则。规则 1（数字字段提取）可能把 "3" 误读为周期/预算。conversation_history（最近 10 轮）已在 prompt 中，LLM 能看到上一轮反问；caption 预填链路（image_captions 注入 + normalize 预填/回填）刚上线。

约束：prompt 模板文案策略属于人的禁区——规则措辞 Review 时可由人改写，AI 只负责结构接入；normalize 代码不改。

## Goals / Non-Goals

**Goals:**
- 序号回复（常见形式）直接分流到 ①②③ 对应意图，预填描述带正确风格方向
- 序号优先于数字字段提取
- 无效序号回退 clarify

**Non-Goals:**
- 不改 normalize 代码（硬编码拦截是后续可选加固）
- 不写序号以外的选项指代规则（"第二个那种"交给 LLM 语义理解）

## Decisions

### D1: 纯模板规则，不动代码

在 `intent_recognition.md.j2` 的图片澄清补充规则后追加「序号快捷回复」段落：

1. 触发条件：上一轮 AI 回复是图片选项反问（prompt 中 conversation_history 可见）且 context 含 image_urls
2. 分流映射：①→text_to_image（电商参数版式风格）、②→text_to_image（氛围海报风格）、③→generate_video（image_url 取第一张 + video_prompt 宣传短片方向）
3. 优先级：序号识别优先于规则 1 的数字字段提取
4. 无效序号（>3）→ clarify 重问
5. reply 为简短确认语

①② 同为 text_to_image，差异通过规则中的风格关键词注入 generation_prompt（白底参数版式 vs 氛围视觉冲击），LLM 预填即带方向，无需代码区分。

备选 B（normalize 硬编码）：需给 `_normalize_intent_output` 新增 conversation_history 参数并做正则判断上文，两处（模板反问文案 + 代码映射）同步维护——否决，理由见 brainstorming 草稿。

### D2: 测试策略——渲染断言 + 规则文本存在性

LLM 分流行为是概率性的，单测不断言 LLM 输出。测试写：
- `_load_system_prompt` 渲染结果包含序号分流规则关键文本（"序号"、"①"、"generate_video" 映射说明）
- conversation_history 中含反问文案 + message="3" 时 prompt 同时包含上文反问与序号规则（LLM 具备分流的全部信息）
- 既有 caption/澄清测试全部不受影响（无 caption 时行为不变）

### D3: video_prompt 双保险——LLM 优先生成，normalize caption 回填兜底

实测发现 LLM 即使被规则要求，仍可能返回 `video_prompt: null`（倾向保守）。因此 normalize 增加确定性兜底：`generate_video` + `video_prompt` 为空 + 有 `image_captions` 时，用 `captions[0]` + 固定句式（"产品在画面中动态展示，镜头环绕主体旋转，电商广告风格"）回填。LLM 已产出时不覆盖；无 caption 时不编造（保持 null）。caption 是 VL 对用户图片的客观描述，不违反数据引用规则。

## Risks / Trade-offs

- [LLM 仍可能误分流（概率性）] → 规则措辞明确触发条件；后续可在 normalize 加硬编码拦截加固（本变更不做）
- [序号规则与其他数字场景冲突（如方案语境下说"3"）] → 规则限定触发条件为「上一轮是图片选项反问」，其他场景行为不变
- [反问文案改动导致规则失配] → 规则引用选项语义（①参数图②宣传图③短片）而非完整文案字符串

## Open Questions

（无）
