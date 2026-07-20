# 竞品分析 capability — Brainstorming Design Doc

> 状态：草稿（待 /opsx:explore 澄清）
> 日期：2026-07-20
> 触发：用户希望药丸增加"竞品分析"入口，基于品类/品牌通过 Web 搜索生成竞品对比报告

## 1. 现状

superpowers.yaml 已从 out_scope 移至 in_scope。目前尚无竞品分析的代码或数据。

## 2. 可用基建（可复用）

- **Web 搜索工具**：`searxng_search` + `web_fetch` — 已在 `market_analysis_agent.py` 和 `product_research_agent.py` 中使用，支持并行搜索 + 进度事件推送。
- **SSE 流模式**：`asyncio.Queue` + `make_emit` + progress/result events — 预算评估/活动/盟域均使用同一模式。
- **意图识别多轮**：已有 `clarify` 机制 + `_normalize_intent_output` 模式。新意图 `competitor_analysis`。
- **入口卡 + 详情页**：`BudgetAssessmentEntryCard` / `ScreenBudgetAssessment` 为模板；glassmorphism + slide-in-right 复用。
- **结果持久化**：按 ID JSON 文件存储（ca-<uuid8>.json）。

## 3. 架构设计

### 3.1 意图识别

**新意图**：`competitor_analysis`

**所需字段**：
- `category`（品类）— 必填，如"运动鞋"、"智能手表"、"电解质饮料"
- `brand_name`（品牌名）— 可选，如"安踏"、"Nike"。如果填了则聚焦该品牌的竞品分析；没填则分析该品类的整体竞争格局

**多轮流程**：
```
用户："帮我做竞品分析"
→ reply：好的，为您做竞品分析。请问您想分析哪个品类？例如：运动鞋、智能穿戴等。

用户："运动鞋"
→ reply：好的！分析运动鞋品类。请问是否有具体的对标品牌？（如：安踏、Nike等）如果没有，我为您分析品类整体竞争格局。

用户："安踏"
→ 字段齐全（category=运动鞋, brand_name=安踏），reply 确认 + "开始分析"按钮
```

**意图 normalize 规则**：
- 缺 `category` → `missing_fields = ["category"]`，保持 `competitor_analysis`
- 有 `category` → `missing_fields = []`，确认 reply，允许触发搜索

### 3.2 SSE 流式搜索

竞品分析搜索比市场分析更聚焦——搜索字段数较少但每个字段深度抓取：

```
Step 1: 搜索竞品品牌列表
  关键词 1: "{category} 竞品品牌排行" 
  → 产出一批竞品品牌名
  
Step 2: 按品牌逐个搜索深度信息（并行）
  关键词: "{brand} 产品矩阵"
  关键词: "{brand} 定价策略"
  关键词: "{brand} 营销渠道 代言"
  关键词: "{brand} 近半年动态"
  → 每个品牌的结果结构化提取

Step 3: LLM 综合生成对比报告
  → 输出结构化 JSON
```

**SSE 事件序列**：
```
event: status    data: {"step": "search_brands", "message": "正在搜索竞品品牌…"}
event: status    data: {"step": "search_brand", "message": "正在搜索 安踏 的产品信息…", "progress": "1/5"}
event: status    data: {"step": "search_brand", "message": "正在搜索 Nike 的产品信息…", "progress": "2/5"}
...
event: result    data: {"competitor_analysis_id": "ca-abc12345", ...}
```

### 3.3 结果持久化

文件：`mock_data/competitor_analysis/results/ca-<uuid8>.json`

```json
{
  "category": "运动鞋",
  "brand_name": "安踏",
  "competitors": [
    {
      "name": "Nike",
      "product_matrix": ["Air Max", "Pegasus", "React"],
      "price_range": "400-1500元",
      "positioning": "高端专业运动",
      "marketing_channels": ["抖音", "小红书", "线下旗舰店"],
      "recent_moves": "2026年Q2推出新中底科技…",
      "sources": ["url1", "url2"]
    }
  ],
  "market_overview": "运动鞋市场竞争激烈…",
  "suggestion": "安踏应以中端性价比切入…"
}
```

### 3.4 入口卡

复用 `BudgetAssessmentEntryCard` 模式：

- Top 竞品差异对比（2-3 个关键维度）
- 一句话核心洞察
- "查看完整竞品分析"按钮

### 3.5 详情页

复用 `ScreenBudgetAssessment` 模式（glassmorphism + skeleton + slide-in）：

- **市场概况**：品类整体竞争格局描述
- **竞品对比表**：品牌 × 维度（价格、定位、渠道、动态）
- **策略建议**：LLM 基于对比推导的差异化建议
- **数据来源**：搜索来源 URL 列表

## 4. 需 /opsx:explore 澄清的问题

1. MVP 阶段是否支持无具体品牌的品类级竞品分析（只传 category 不传 brand_name）？可以但搜索范围更广、结果可能不够聚焦。
2. 竞品对比的"维度"前端是否需要固定表格结构，还是纯 markdown 渲染？（倾向结构化表格，参考市场分析报告）
3. 每个品牌搜索 4 个关键词是否过多？MVP 可以简化为 2 个（品牌列表 + 品牌详情）。
4. `brand_name` 字段是否依赖现有 `brand_input.brand_name`（与方案生成共用的字段）？建议复用——用户填了品牌名就有了。
