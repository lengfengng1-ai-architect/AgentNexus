## Context

当前 `MarketAnalysisReport` 是 V1 平铺结构，包含 4 个维度 + 一篇 markdown。新 schema 参考产品分析团队的实体结构，升级为可溯源的市场研究模型。

关键升级：
- 单次 LLM 输出所有字段 → 7 个 LangGraph 节点逐段输出
- 无证据链 → 每个数据点关联 evidence_id
- 固定 4 维 → 灵活的市场边界/规模/趋势/用户/竞争/评估
- 置信度字符串 → high/medium/low 三级制

## Goals / Non-Goals

**Goals：**
- `MarketResearchResult` 作为根对象，包含 6 大模块 + evidence
- 每个模块一个 LangGraph 节点，串行执行，每节点完成 emit progress 事件
- 三级置信度替代数值分数
- 后端 API 返回新 schema，mock 数据同步更新
- CLI 验证可用

**Non-Goals：**
- 不更新前端
- 不做真实搜索（后续独立 change）

## Decisions

1. **7 节点 LangGraph 图**
   ```
   define → size → trends → users → competitors → assess → synthesize
   ```
   每节点输出对应的子模块，synthesize 节点将之前 6 个子模块拼成完整 `MarketResearchResult`。

2. **SSE stream 对应节点维度**
   每个节点完成 emit 一次 progress 事件，事件字段：

   ```
   { "node": "define", "progress": 14 }
   { "node": "size", "progress": 28 }
   { "node": "trends", "progress": 42 }
   ...
   { "node": "synthesize", "progress": 100 }
   { "type": "result", "data": { ... } }
   ```

3. **输入：`market_name` + `category`**
   `brand_name` 语义不是市场/赛道研究需要的，改为 `market_name`（如"冰美式赛道"）。但 `category` 保留作为行业分类上下文。

4. **evidence 聚合在 synthesize 节点**
   前面 6 个节点各自收集自己的 evidence 列表，synthesize 去重合并到最终输出的 `evidence` 数组中。各节点中通过 `evidence_ids` 引用。

5. **full_report 保留**
   最终 synthesize 节点用模板拼接各模块内容生成 markdown 报告，保障前端兼容。

## Processing Model

```
输入: { market_name: "冰美式咖啡", category: "咖啡饮品" }
         │
         ▼
┌─────────────────────────────────────────────┐
│  LangGraph: 7 nodes (serial)                │
│                                             │
│  node: define      → market_definition +   │ ← emit progress
│                       market_name/type      │
│  node: size        → market_size            │ ← emit progress
│  node: trends      → trend_signals          │ ← emit progress
│  node: users       → target_users           │ ← emit progress
│  node: competitors → competitors            │ ← emit progress
│  node: assess      → opportunity_assessment │ ← emit progress
│  node: synthesize  → full_report + evidence │ ← emit result
└─────────────────────────────────────────────┘
         │
         ▼
输出: 完整 MarketResearchResult JSON
```

## Components

```
MarketResearchResult (根对象)
├── market_name, market_type, industry, category, description
├── geo_scope, time_scope
├── research_purpose, research_depth
├── market_definition
│   ├── included_scope, excluded_scope
│   ├── upstream, downstream
│   ├── substitute_solutions, definition_notes
├── market_size
│   ├── tam { value, unit, calculation_method, confidence_level, evidence_ids }
│   ├── sam { ... }
│   ├── som { ... }
│   ├── cagr { value, period, confidence_level, evidence_ids }
│   └── conflict_notes
├── trend_signals[]
│   └── { signal_type, title, summary, impact, confidence_level, evidence_ids }
├── target_users[]
│   └── { segment_name, user_profile, core_scenarios[], pain_points[],
│          purchase_drivers[], purchase_barriers[], willingness_to_pay, evidence_ids }
├── competitors[]
│   └── { company_name, brand, product_or_service, positioning, pricing,
│          channels[], strengths[], weaknesses[], evidence_ids }
├── opportunity_assessment
│   ├── market_attractiveness, competition_intensity, entry_difficulty, data_confidence
│   ├── key_opportunities[], key_risks[], recommended_actions[], unknowns_to_verify[]
├── evidence[]
│   └── { evidence_id, claim, source_type, source_name, source_url,
│          publish_time, retrieved_at, original_excerpt, confidence_level,
│          cross_validated, conflict_notes }
└── full_report (synthesize 节点拼接)
```

## Risks / Trade-offs

- **7 节点串行 Latency**：每节点一次 LLM 调用，总耗时 = sum(各节点)。SSE progress 让用户看到进度。
- **LLM 上下文一致性**：后序节点需要前序节点的输出做输入。每个节点收到的 state 包含前面所有节点的输出。
- **Evidence ID 索引**：需要全局唯一的 evidence_id 生成（时间戳 + 序号），各节点不能冲突。
- **三级置信度信息损失**：比数值粒度粗，但 LLM 输出稳定，MVP 验证通过后再改数值。
