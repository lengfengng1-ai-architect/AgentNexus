## Context

竞品分析是新 capability，基于品类/品牌通过 Web 搜索获取竞品信息并生成结构化对比报告。MVP 阶段同时支持品类级（无具体品牌）和品牌级（有具体品牌）两种模式。

已有基建可复用：
- `market_analysis_agent.py` 和 `product_research_agent.py` 已实现 `searxng_search` + `web_fetch` 并行搜索模式
- SSE 流模式（`asyncio.Queue` + `make_emit`）在 budget/activity/alliance 三药丸中已成熟
- 意图识别多轮 + `_normalize_intent_output` 模式在 intent_recognition_agent.py 中已定型
- 入口卡 + 毛玻璃详情页 + slide-in-right 转场有完整模板

## Goals / Non-Goals

**Goals:**
- 用户说"帮我做竞品分析" → 意图识别为 `competitor_analysis`
- 多轮收集 category（必填）+ brand_name（可选）
- 字段齐后自动触发 Web 搜索流，SSE 推送搜索进度
- 结果持久化到 `mock_data/competitor_analysis/results/ca-<uuid8>.json`，按 ID 取
- 聊天入口卡 + 独立毛玻璃详情页
- 支持品类级（无 brand_name）和品牌级（有 brand_name）两种深度

**Non-Goals:**
- 不自动存入竞品数据
- 不接入外部平台付费数据
- 不替代市场分析（两者互补：市场分析→行业/消费者；竞品分析→品牌逐项对比）

## Decisions

### 1. 搜索策略：品类级 vs 品牌级

品类级（无 brand_name）：
- 关键词 1: `{category} 竞品品牌排行 2026`
- 关键词 2: `{category} 市场份额 品牌`
- 关键词 3: `{category} 行业竞争格局`
- → LLM 从搜索结果中提取 Top 5 竞品品牌 + 品类概览

品牌级（有 brand_name）：
- 阶段 1（发现竞品）：`{brand_name} 竞品 {category}`、`{category} 竞品对比`
- 阶段 2（逐个深搜）：`{brand} 产品系列 价格`、`{brand} 营销代言`、`{brand} 近半年动态 2026`
- → LLM 结构化输出品牌 × 维度对比表

### 2. 搜索结果结构化

每个竞品品牌的结构：
```python
class CompetitorItem(BaseModel):
    name: str                               # 竞品品牌名
    product_matrix: list[str] | None        # 产品线
    price_range: str | None                 # 价格区间
    positioning: str | None                 # 市场定位
    marketing_channels: list[str] | None    # 营销渠道
    recent_moves: str | None                # 近半年动态
    sources: list[str]                      # 信息来源 URL
```

### 3. SSE 流步序

```
event: status  {"step": "search_overview", "message": "正在搜索品类竞争格局…"}
event: status  {"step": "search_brand", "message": "正在搜索 Nike 产品信息…", "progress": "1/4"}
event: status  {"step": "search_brand", "message": "正在搜索 安踏 产品信息…", "progress": "2/4"}
event: status  {"step": "analyzing", "message": "正在分析竞品对比…"}
event: result  {"competitor_analysis_id": "ca-abc12345", ...}
```

### 4. 入口卡 + 详情页布局

**入口卡**（`CompetitorAnalysisEntryCard`）：
- 品类名 + 竞品数量摘要
- Top 维度差异一句话
- 核心 LLM 建议
- "查看完整竞品分析"按钮

**详情页**（`ScreenCompetitorAnalysis`）：
- 毛玻璃 topbar（品类 + 品牌名）→ 返回按钮
- 市场概况卡片（品类竞争格局描述）
- 竞品对比卡片（表格形式：品牌 × 维度）
- 策略建议卡片（LLM 基于对比的差异化建议）
- 数据来源卡片（URL 列表）

### 5. 后端架构

复用 budget_analysis 模式：
- `competitor_analysis_service.py`：`analyze_stream()` SSE 生成器 + `save/get` 持久化
- `competitor_analysis.py` 路由：`POST /competitor-analysis/stream` + `GET /competitor-analysis/results/{id}`
- 搜索调用 `searxng_search` + `web_fetch`（复用 llm_utils.py）
- 结果 LLM 生成：调用 LLM 从搜索文本综合产出结构化对比

## Risks / Trade-offs

- **[搜索延迟]** 品牌级模式需要 4+ 次搜索，总延迟可能 >15s → 通过 SSE 进度事件告知用户当前步骤，缓解等待感
- **[搜索质量]** 品类级搜索的竞品列表完全依赖搜索返回结果，可能漏掉重要品牌 → 方案：品牌级模式允许用户指定品牌名后深度分析
- **[Web 搜索可用性]** searxng 实例可能不可用 → 同 market_analysis 已有容错机制（失败跳过 + 返回已有结果）
- **[LLM 编造风险]** LLM 可能"补充"搜索结果未覆盖的信息 → 每个字段标注 source URL，不可编造

## Open Questions

1. 品类级竞品搜索，搜索结果 Top 5 品牌不够用时是否降级提示？（倾向：不够就如实展示找到的几个，不强求虚构）
