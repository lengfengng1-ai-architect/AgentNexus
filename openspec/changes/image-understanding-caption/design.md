# Design: image-understanding-caption

## Context

全链路 LLM 均为纯文本模型：意图识别用 deepseek-v4-flash（`settings.myself_model`），prompt 优化用同一文本模型。图片在 prompt 中仅以 URL 字符串出现，模型看不到内容。DashScope key/base_url 已配置（图/视频生成在用），qwen-vl-plus 可直接复用，OpenAI 兼容模式支持 base64 data URI 内联图片——`image_base64.to_data_uri()` 已有现成的本地文件→base64 转换（含路径穿越防护），可直接复用。

现有接线点：
- `POST /upload`（routers/upload.py）：逐文件保存后组装 `UploadFileItem` —— caption 挂载点
- 意图识别：`_load_system_prompt` 已透传 `image_urls` 到 clean_ctx；模板已有 image_urls 区块
- prompt 优化：`/prompt/optimize` 请求体仅 `{prompt, type}`；**无 OpenAPI YAML（既有缺口，本次补）**
- 前端：`ChatMessage.imageUrls` + `getLatestImageUrls` 跨轮延续；`INTENT_RECEIVED` 已透传 video_prompt/generation_prompt 到卡片

约束：caption 是 LLM 生成内容，但属于"基于已有图片数据的客观描述"，不违反数据引用规则（描述对象是用户自己上传的图）；禁止 caption 编造品牌名（prompt 中明确约束）。

## Goals / Non-Goals

**Goals:**
- 上传图片即得 caption，后续所有文本 LLM 环节"可读"图片内容
- 以图生图/生视频卡片自动预填具体描述
- AI 优化结果与图片相关
- VL 失败全链路降级为现状，不阻塞

**Non-Goals:**
- 不做 VQA 多轮图片问答
- 不换意图识别主模型
- 不做 caption 缓存/去重

## Decisions

### D1: caption 在上传接口内同步生成（非意图识别时懒生成）

上传是明确的等待场景（前端有 uploading 态），caption 与图片生命周期绑定，多轮对话复用同一张图无需重复生成。多图 `asyncio.gather` 并发，总延迟 ≈ max(单图 VL 延迟) ≈ 1-2s，可接受。

备选：意图识别时懒生成 —— 否决，首次对话延迟不可控，且 prompt 优化接口仍需另传 caption，前端要维护两条传递路径。

### D2: qwen-vl-plus + OpenAI 兼容模式 + base64 内联

`qwen-vl-plus` 对"客观描述一张产品图"足够（max 精度收益对 1-2 句 caption 不显著，成本更高）。调用方式复用项目现有 openai SDK（`settings.dashscope_api_key` + dashscope base_url），图片输入用 `to_data_uri()` 转 data URI（与 qwen-image/wan2.7 的 Base64 内联方案一致，无需公网 URL）。超时 20s（`asyncio.wait_for` 或 client timeout；7MB 产品图 base64 约 10MB，5s 弱网会误杀），异常降级 null + warning 日志。

### D3: caption prompt 设计（约束客观、禁编造品牌）

系统 prompt 要求：1-2 句中文；描述主体类型/颜色/材质、构图视角、背景、风格；**禁止猜测或编造品牌名、logo 文字以外的品牌信息**；输出纯文本不带格式。这符合 Superpowers 数据引用规则（描述来自真实图片数据，非编造）。

### D4: caption 随消息持久化 + 跨轮延续（与 imageUrls 同构）

前端 `ChatMessage` 增加 `imageCaptions?: string[]`（与 `imageUrls` 索引对齐）；`handleFileSelect` 从上传响应存入；`sendMessage` 组装 context 时 `image_captions` 用「本轮优先，否则最近一条带图消息的 captions」（`getLatestImageCaptions`，复制 `getLatestImageUrls` 模式）。localStorage 已有消息持久化，caption 随之自然持久化（刷新后历史图仍可被理解）。

### D5: 意图识别模板——caption 区块 + 预填规则（业务规则待确认）

模板在 image_urls 区块旁新增：

```
{% if context.get('image_captions') %}
附件图片描述：{{ context.image_captions | join('；') }}
{% endif %}
```

规则补充（第 3/5 条 generate_video/text_to_image）：有 caption 时，`video_prompt`/`generation_prompt` 结合 caption 与用户文字生成具体描述；用户文字提供场景/风格时以用户文字为主，caption 仅补主体；用户文字无描述时，基于 caption 生成合理的默认描述（如"红色跑鞋在灯光下旋转展示，电商广告风格"）。

**注意**：intent prompt 的文案策略属于人的禁区——以上规则措辞在 Review 时可由人改写，AI 只负责接线。

### D6: prompt 优化接口加可选 image_context（顺带补契约）

`/prompt/optimize` 请求体加 `image_context: str | None`（可选，max 500 字），模板渲染「参考图片内容：…（如有）」。这是**新增可选字段，向后兼容**。本接口此前无 OpenAPI YAML（既有缺口），本次补 `docs/api/paths/prompt-optimizer.yaml` 覆盖现状 + 新字段。前端 `optimizePrompt(prompt, type, imageContext?)` 第三参可选，两张卡片从 message 取第一张图 caption 传入。

### D7: caption 不进 user 消息气泡 UI

caption 是机器中间数据，用户不需要看到；仅存消息对象用于 context 组装与优化调用。气泡 UI 不变。

## Risks / Trade-offs

- [上传延迟 +1~2s] → 并发 + 20s 超时 + 失败降级；上传本来就有 loading 态
- [VL 描述错误（认错产品）] → caption 仅作预填草稿，用户可编辑 textarea；prompt 中约束客观描述降低幻觉
- [caption 泄露到 prompt 日志] → 日志截断（与 image_url 同款处理）
- [qwen-vl-plus 费用] → 每次上传一次调用，量级与现有图/视频生成相比可忽略
- [老历史消息无 caption] → imageCaptions 为 undefined，全链路按无 caption 处理，向后兼容

## Open Questions

（无）
