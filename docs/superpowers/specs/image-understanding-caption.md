# 图片理解前置：VL caption → 意图识别/预填/优化（探索草稿）

> 本文档为 brainstorming 产出的设计探索草稿，**不是正式 API 契约**。正式变更需经 `/opsx:explore` 澄清后，由 `/opsx:propose` 形成。

## 背景与问题

用户上传图片后，全链路 LLM（意图识别 `deepseek-v4-flash`、prompt 优化）都是纯文本模型，图片只以 URL 字符串出现在 prompt 中，模型看不到图片内容。导致三个相互关联的问题：

1. 以图生视频：`generate_video` 意图的 `video_prompt` 只能从用户文字提取，"生成产品宣传片"这类零描述输入 → 卡片无预填
2. 以图生图：同理 `generation_prompt` 无预填
3. AI 优化：`/prompt/optimize` 只收 `{prompt, type}`，连 image_url 都不传，优化结果与图片无关

## 设计方向（方案 A，已获用户确认）

**核心思路**：上传后先用视觉模型（qwen-vl 系列，DashScope 已配 key）生成一段结构化图片描述（caption），后续所有文本 LLM 环节消费这段 caption，而不是直接看图。

```
上传图片 → POST /upload（已有）
              │
              └─→ 新增：image_caption 服务（qwen-vl）
                    "一双红色跑鞋，白底，侧面视角，织物鞋面"
                          │
        ┌─────────────────┼─────────────────────┐
        ▼                 ▼                     ▼
  意图识别 prompt      卡片预填              /prompt/optimize
  image_context:      video_prompt /        新增 image_context
  caption 注入        generation_prompt     入参（可选）
```

### Caption 生成时机（二选一，待澄清）

- **时机 A：上传接口内同步生成** — `POST /upload` 返回时每个 file 多带一个 `caption` 字段。优点：前端零改动接线（caption 随 URL 一起入消息）；缺点：上传接口延迟 +1~2s/图。
- **时机 B：意图识别时懒生成** — chat/stream 收到 image_urls 且无 caption 时先调 VL。优点：上传保持快；缺点：首次对话延迟增加，且上传接口与 caption 解耦后前端要额外传递。
- **倾向 A**：上传是明确的等待场景（有 loading 态），caption 与图片生命周期绑定，多轮对话复用同一张图时无需重复生成。多图可并发。

### Caption 内容形态

一次 VL 调用，要求输出 1-2 句中文客观描述：主体（产品类型/颜色/材质）、构图视角、背景、风格。不编造品牌名。例如：

> "一双亮红色低帮跑鞋，织物鞋面配白色中底，45° 侧面视角，纯白背景，电商产品摄影风格。"

### 三个消费点的接线

1. **意图识别**（`intent_recognition.md.j2` + `_load_system_prompt`）：context 新增 `image_captions: list[str]`，prompt 中渲染为「附件图片描述：…」。规则补充：以图生图/生视频时，`generation_prompt`/`video_prompt` 结合 caption 与用户文字生成具体描述（用户文字优先，caption 补主体信息）。
2. **卡片预填**：意图输出已有 `video_prompt`/`generation_prompt` 字段，LLM 拿到 caption 后自然能预填，前端无需改动（`INTENT_RECEIVED` 已透传）。
3. **prompt 优化**（`/prompt/optimize`）：请求体新增可选 `image_context: str`，模板 `prompt_optimizer.md.j2` 渲染为「参考图片内容：…」；前端 `optimizePrompt()` 增加可选第三参，卡片调用处把 caption 传入。

### Caption 的存储与传递

- 前端：`/upload` 响应带 caption → `handleFileSelect` 把 `{url, caption}` 存入消息（`ChatMessage` 需扩展或并行数组）→ `sendMessage` context 带 `image_captions`
- 跨轮延续：与现有 `getLatestImageUrls` 同款逻辑取最近一条带图消息的 captions
- AI 优化按钮：`InlineImageCard`/`InlineVideoCard` 需能访问 caption —— 经 `ChatMessage` 传入 props

### 失败降级

VL 调用失败/超时（5s）：caption 置 null，全链路退化为现状（URL 文本），不阻塞上传和对话。

## 范围

- **后端**：新增 `app/services/image_caption.py`（VL 调用）；`POST /upload` 响应 schema 加 `caption`；chat context 透传；`intent_recognition.md.j2` 加 caption 区块与预填规则；`/prompt/optimize` 请求体加 `image_context`；`prompt_optimizer.md.j2` 加渲染
- **前端**：`ChatMessage`/上传响应类型加 caption；`sendMessage` context 组装；`optimizePrompt` 签名扩展；两张卡片调用处传 caption
- **in_scope**：video-generation 链路的体验增强；图片理解属于现有以图生图/生视频能力的必要组成
- **out_scope 风险**：无（不接入外部平台数据）

## 待澄清（进入 /opsx:explore 时确认）

1. Caption 生成时机：A（上传同步）还是 B（意图识别懒生成）？—— 倾向 A
2. VL 模型选型：qwen-vl-plus（便宜快）还是 qwen-vl-max（更准）？—— 倾向 plus，caption 只需客观描述
3. 多图场景：caption 逐图生成（并发），预填时用第一张图的 caption 还是合并？—— 倾向第一张（与现有 image_url 取第一张逻辑一致）
4. caption 是否随 localStorage 历史持久化？—— 倾向持久化（刷新后历史消息的图仍可被正确理解）
5. 用户修改图片后（重新上传）caption 重新生成，无缓存复用问题（同名 uuid 文件）
