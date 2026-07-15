## Context

当前意图识别只有 generate_plan（全流水线）和 chat（纯聊天）两个出口。用户说"分析娃哈哈的竞品"或"帮我做市场调研"时，没有中间态的独立消费路径。现有 `POST /market-analysis/stream` 端点已能流式返回 6 阶段的市场分析结果，但意图识别侧没有通向该端点的路由，前端也缺少对应的消费 handler。

## Goals / Non-Goals

**Goals:**
- 意图识别新增 `market_research`，识别关键词如"竞品分析"、"市场调研"、"行业分析"等
- `IntentRecognitionOutput` 新增 `market_name` 字段，独立于 `brand_name`，语义为"研究目标/市场/赛道名"
- `market_research` 需要 `market_name`（研究目标）+`category`（品类）齐全才能执行，缺字段时 prompt 反问补齐
- 前端收到 `market_research` + 字段齐全时，展示"开始分析"按钮，用户点击后调 `POST /market-analysis/stream`
- SSE 流式消费：progress 事件实时追加阶段进度，result 事件替换为 `full_report` markdown
- 不跳转屏，不触发生成方案流水线

**Non-Goals:**
- 不做 `market_research` 独立 HTTP 端点（复用已有 `/market-analysis/stream`）
- 不做 pipeline completed_nodes 跳过支持（本次 focus 在独立消费，不集成到流水线）
- 不做 `MarketResearchResult` → `MarketResearchOutput` adapter（独立消费不需要）
- 不做 market analysis 端的改动

## Decisions

### Decision 1: market_name 字段设计

**选择：在 IntentRecognitionOutput 顶层新增 `market_name: str | None` 字段，不塞入 BrandInput**

```
IntentRecognitionOutput:
  intent: "market_research" | ...
  market_name: str | None    ← 研究目标（品牌名/赛道名）
  brand_input: BrandInput     ← 保持现有（含 category）
  missing_fields: [...]

BrandInput 保持不变:
  brand_name, category, city, budget, period  ← 用于 generate_plan
```

**理由：**
- `market_name` 语义是"研究目标/市场/赛道名称"，与 `brand_name`（品牌名）不同。用户说"分析电解质饮料赛道"时，提取到 `market_name="电解质饮料"`、`category="饮料"`，此时 brand_name 不应被填充。
- 放在顶层避免污染 BrandInput 的既有语义（BrandInput 下游用于方案流水线）。

**字段取值规则：**
| 用户输入 | market_name | category |
|---|---|---|
| "分析娃哈哈" | "娃哈哈" | null → 反问 |
| "分析娃哈哈，饮料" | "娃哈哈" | "饮料" |
| "电解质饮料的市场调研" | "电解质饮料" | null → 反问 |
| "健身行业的市场规模" | "健身行业" | null → 反问 |

### Decision 2: market_research 字段补齐方式

**选择：LLM 反问 + 多轮对话补齐**

```
用户: "帮我做竞品分析"
  → intent_recognition 识别为 market_research
  → market_name=null, category=null
  → missing_fields=["market_name", "category"]
  → reply="好的，我来帮您做市场分析。请问您想分析哪个品牌或赛道？属于什么品类？"
  ↓
用户: "分析娃哈哈，饮料"
  → intent_recognition（上下文已有第一轮的市场调研意图 + 字段值）
  → market_name="娃哈哈", category="饮料", missing_fields=[]
  → 前端展示"开始分析"按钮
```

**反问话术：**
- 缺 `market_name` 和 `category` → "请问您想分析哪个品牌或赛道？以及属于什么品类？"
- 缺 `market_name`（有 category）→ "请问您想分析哪个品牌或赛道？"
- 缺 `category`（有 market_name）→ "请问它属于什么品类？例如：饮料、运动服饰等"

### Decision 3: 按钮触发 + SSE 流式消费

**选择：字段齐全后展示"开始分析"按钮，用户确认后才发起请求**

```
ScreenChat:
  收到 intent="market_research" + missing_fields 为空
    → ChatBubble 展示 LLM 的 reply 内容
    → 气泡底部显示"开始分析"按钮（canStartMarketResearch=true）
    → 用户点击"开始分析":
      → 气泡追加"🔍 正在启动市场分析…"
      → fetch POST /market-analysis/stream({market_name, category})
      → 消费 SSE 事件:
          progress → 追加 "📋 定义市场范围" / "📏 测算市场规模" 等进度行
          data     → 可选：追加节点名 + 状态
          node_end → 追加 "✓ {stage} 完成"
          result   → 气泡替换为 full_report markdown
      → 不跳转屏，不触发 plan/run
```

**改动点：**
| 层 | 改动 |
|---|---|
| `ChatMessage` | 新增 `canStartMarketResearch?: boolean`, `marketName?: string` |
| `chatReducer` `INTENT_RECEIVED` | `canStartMarketResearch = intent==='market_research' && missing_fields为空` |
| `ChatBubble` | 新增 `onStartMarketResearch` prop，渲染"开始分析"按钮 |
| `ScreenChat` | 新增 `handleStartMarketResearch` callback，消费 SSE，展示进度和最终报告 |

### Decision 4: 进度展示格式

**选择：在对话气泡中逐行追加进度文本**

market-analysis/stream 的 SSE 事件格式：
```
event: progress
data: {"node":"define","progress":14,"stage":"📋 定义市场范围"}

event: data
data: {"node":"define","result":{...}}

event: node_end
data: {"node":"define","status":"completed","error":null}
```

前端消费方式：
- `progress` 事件 → 追加 `📋 定义市场范围` 到气泡 content
- `node_end` 事件 → 追加 `  ✓ 完成`
- `result` 事件 → 将气泡 content 替换为 `full_report` markdown

最终气泡文本示例：
```
📋 定义市场范围 ✓
📏 测算市场规模 ✓
🔍 扫描行业趋势 ✓
👥 分析目标用户 ✓
🏢 梳理竞争格局 ✓
📊 评估市场机会 ✓

<--- full_report markdown 替换后 --->

## 市场分析报告

[完整报告内容...]
```

### Decision 5: prompt 规则插入位置

**选择：在 `generate_plan` 和 `clarify`/`query_data` 之间插入 `market_research`**

优先级排序：
1. 字段齐全 + 品牌方案意图 → `generate_plan`
2. 用户表达调研/分析/竞品意图 → `market_research`
3. 用户明确修改 → `update_context`
4. 图生视频 → `generate_video`
5. 文生视频 → `text_to_video`
6. 文生图 → `text_to_image`
7. 字段不全但意图是生成方案 → `clarify`
8. 查询数据 → `query_data`
9. 以上均不匹配 → `chat`

`market_research` 的字段检查（`_normalize_intent_output`）：
- 检查 `market_name` 和 `category`（从 `brand_input.category` 取值）是否都非空
- 缺任一 → 设 `missing_fields` + 自动回复反问话术
- 都齐全 → 保留 `market_research` 不变（不被 override 为 generate_plan）

## Risks / Trade-offs

- **market_name 与 brand_name 的双轨制**：两个字段都在意图识别输出中存在，但语义不同。prompt 需要明确区分两者的提取规则——`market_name` 来自调研意图输入，`brand_name` 来自方案意图输入，互不干扰。
- **SSE 消费状态管理**：ScreenChat 中 market_research 的 SSE 流与 Chat SSE 流是独立的两个连接。需确保两者不相互打断，且组件卸载时正确 abort。
- **market_name 的持久化**：当前 `useChat` 从 `messages` 中提取 `brandInput` 作为 context 传给下一次 intent_recognition。`market_name` 需要同样逻辑：从消息记录中提取上次的 `market_name` 累加到 context。
