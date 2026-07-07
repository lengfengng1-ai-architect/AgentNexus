# 千问文生图模型 (Qwen-Image) API 参考

> **模型**: qwen-image-2.0-pro（推荐）、qwen-image-2.0、qwen-image-max、qwen-image-plus
> **服务商**: 阿里云百炼 (DashScope)
> **用途**: 营销方案图片生成 Agent 的底层图片生成服务

---

## 快速参考

| 项目 | 值 |
|------|-----|
| 推荐模型 | `qwen-image-2.0-pro`（文字渲染强、语义遵循好） |
| 同步接口 | `POST /api/v1/services/aigc/multimodal-generation/generation` |
| 异步接口 | `POST /api/v1/services/aigc/text2image/image-synthesis`（仅 qwen-image-plus/qwen-image） |
| SDK | `dashscope` Python SDK — `MultiModalConversation.call()` |
| 认证 | Header `Authorization: Bearer $DASHSCOPE_API_KEY` |
| 北京地域 URL | `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com` |
| 新加坡地域 URL | `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com` |

---

## 同步接口（推荐用于 qwen-image-2.0-pro）

### HTTP 调用

```
POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| model | string | 是 | 模型名称，如 `qwen-image-2.0-pro` |
| input.messages[].role | string | 是 | 固定为 `user` |
| input.messages[].content[].text | string | 是 | 正向提示词（中文），描述期望生成的图像内容、风格和构图。qwen-image-2.0 系列上限 1300 Token |
| parameters.negative_prompt | string | 否 | 反向提示词，不超过 500 字符 |
| parameters.size | string | 否 | 分辨率，如 `2048*2048`（默认） |
| parameters.n | integer | 否 | 输出数量，qwen-image-2.0 系列支持 1-6 张 |
| parameters.prompt_extend | bool | 否 | 是否开启 Prompt 智能改写，默认 true |
| parameters.watermark | bool | 否 | 是否添加水印，默认 false |
| parameters.seed | integer | 否 | 随机种子，范围 [0, 2147483647] |

### 推荐分辨率（qwen-image-2.0 系列）

| 分辨率 | 比例 | 适用场景 |
|--------|------|----------|
| `2048*2048` | 1:1 | 默认，通用 |
| `2688*1536` | 16:9 | 横版海报、主视觉 |
| `1536*2688` | 9:16 | 竖版海报、手机封面 |
| `2368*1728` | 4:3 | 演示文稿 |
| `1728*2368` | 3:4 | 社交配图 |

### 响应

```json
{
  "output": {
    "choices": [{
      "finish_reason": "stop",
      "message": {
        "content": [{ "image": "https://...png?Expires=..." }],
        "role": "assistant"
      }
    }]
  },
  "usage": { "image_count": 1, "width": 2048, "height": 2048 },
  "request_id": "..."
}
```

> **注意**: 图片 URL 有效期 **24 小时**，需及时下载转存。

### Python SDK 示例

```python
import os
from dashscope import MultiModalConversation

response = MultiModalConversation.call(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    model="qwen-image-2.0-pro",
    messages=[{
        "role": "user",
        "content": [{"text": "你的正向提示词..."}]
    }],
    result_format='message',
    negative_prompt="低分辨率，低画质，肢体畸形，手指畸形...",
    size='2048*2048',
    prompt_extend=True,
    watermark=False,
)

if response.status_code == 200:
    image_url = response.output.choices[0].message.content[0].image
else:
    print(f"Error: {response.code} - {response.message}")
```

---

## 异步接口（qwen-image-plus / qwen-image 专用）

两步流程：创建任务 → 轮询结果。

### 步骤 1：创建任务

```
POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis
Header: X-DashScope-Async: enable
```

```json
{
  "model": "qwen-image-plus",
  "input": { "prompt": "..." },
  "parameters": { "size": "1664*928", "n": 1, "prompt_extend": true, "watermark": false }
}
```

响应返回 `task_id`，有效期 24 小时。

### 步骤 2：查询结果

```
GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id}
```

轮询间隔建议 **10 秒**。任务状态: `PENDING → RUNNING → SUCCEEDED/FAILED`。

Python SDK 使用 `ImageSynthesis.async_call()` + `ImageSynthesis.fetch()`。

---

## 关键设计考量（供 Agent 实现参考）

1. **Prompt 生成**: 由 LLM 根据营销方案章节内容生成详细的 image prompt，充分利用 `prompt_extend` 自动优化
2. **图片持久化**: API 返回的 URL 仅 24h 有效，服务端需下载后转存（本地或 OSS）
3. **尺寸选择**: 根据图片用途选择分辨率 — 主视觉用 16:9、海报用 9:16、社交配图用 1:1
4. **错误处理**: 需处理 `InvalidParameter`（参数错误）、`InvalidApiKey`（鉴权）、限流（RPS）等错误
5. **模型选择**: MVP 推荐 `qwen-image-2.0-pro`（同步接口，使用简单，文字渲染能力强）

---

## 参考链接

- [使用指南](https://help.aliyun.com/zh/model-studio/text-to-image)
- [Prompt 指南](https://help.aliyun.com/zh/model-studio/text-to-image-prompt)
- [错误码](https://help.aliyun.com/zh/model-studio/error-code)
- [模型价格](https://help.aliyun.com/zh/model-studio/model-pricing)
