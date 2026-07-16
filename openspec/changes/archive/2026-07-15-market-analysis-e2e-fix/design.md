## Context

后端 `assemble_result()` 中 `evidence=[]` 硬编码为空。但 prompt 模板要求 LLM 以 `"文本 — 来源: URL"` 格式内联标注来源。前端 source 窗口读取 `nodeResult.evidence` 时永远拿不到数据。

同时 `MarketResearchResultCards` 渲染完整报告时用 `<div>{fullReport}</div>` 纯文本输出，没有经过 `marked.parse()`。

## Goals / Non-Goals

**Goals:**
- 后端 `assemble_result()` 加正则 `/(——|--) 来源:\s*(\S+)/` 提取来源，填充 `evidence[]`
- 前端 SSE data 事件同样从文本字段提取来源（双层保障）
- 完整报告用 `marked.parse()` 渲染
- 补充 mock 数据

**Non-Goals:**
- 不改动 prompt 模板（文本格式本身正确，只是没被提取）
- 不改动 Card 组件逻辑

## Decisions

### 1. 后端提取来源

在 `assemble_result()` 末段遍历 `definition_notes`、各字段文本内容，正则提取 URL：

```python
import re
_SOURCE_RE = re.compile(r'[—\-]{1,2}\s*来源:\s*(\S+)')

def _extract_sources(*texts: str) -> list[dict]:
    sources = []
    for t in texts:
        for m in _SOURCE_RE.finditer(t):
            url = m.group(1)
            if url and url not in seen:
                seen.add(url)
                sources.append({"source_url": url, ...})
    return sources
```

### 2. 前端双重提取

`data` 事件中用相同正则从 `nodeResult` 各文本字段提取，直接填充 srouces。

### 3. 完整报告渲染

`MarketResearchResultCards` 中 fullReport 区域：
```tsx
<div dangerouslySetInnerHTML={{ __html: marked.parse(fullReport) }} />
```
