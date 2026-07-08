---
name: market-research-optimization
description: 市场调研 agent 性能优化方案 — Semaphore 限流 + 超时缩短 + 搜索词优化
---

# 市场调研 Agent 性能优化

## 背景

市场调研 agent（`market_research_agent.py`）在流水线中运行时间显著长于产品调研和人群洞察 agent。日志分析显示耗时差距约 **3 倍**（57s vs 20s）。

## 问题诊断

三个调研 agent 的执行逻辑相同：搜索 → 并发抓取 25 页 → LLM 结构化提取。代码逻辑一致，但**搜索结果页面的类型不同**导致性能差异：

| Agent | 搜索关键词 | 搜索结果类型 | 页面特点 |
|-------|-----------|-------------|---------|
| product_research | `"{品牌}" "{品牌} 产品规格"` | 官网、电商、评测 | 轻量级页面 |
| audience_insight | `"{品牌} 用户画像" "{品牌} 消费者分析"` | 行业文章 | 中等 |
| market_research | `"{品类} 市场规模 增长率" "{品类} 产业链"` | 行业门户、研报站 | 重、易屏蔽 |

日志确认大量 403 Forbidden（知乎、百度百科等），这些域名无法抓取但仍占用并发槽位。

## 优化方案（三合一）

### 1. Semaphore 并发控制 + 超时缩短

当前 `asyncio.gather` 同时发起 25 个请求，**等最慢的页面完成才返回**。行业数据页面加载慢，2-3 个慢页面拖垮整体。

- **Semaphore(8)**：同时最多 8 个并发请求，避免连接池过载和对方服务器限流
- **FETCH_TIMEOUT 15→10s**：慢页面快速放弃，不再等到 15s
- **MAX_PAGE_CHARS 8000→4000**：单页截断减半，LLM 提取的 prompt 变小，处理更快

### 2. 屏蔽已知 403 域名

日志中有大量重复 403 的域名，这些请求不仅返回空，还无谓耗用并发槽位：

- `zhuanlan.zhihu.com`
- `baike.baidu.com`
- `wenku.baidu.com`

新增 `BLOCKED_DOMAINS` 集合，在搜索去重阶段直接跳过这些 URL。

### 3. 搜索词优化

当前关键词引导 SearxNG 返回行业门户等慢速页面。调整搜索词，让结果偏向**信息来源**（咨询报告、正规媒体、行业白皮书），这些页面加载更快、数据更可信：

| 原关键词 | 调整后 | 目标来源 |
|---------|--------|---------|
| `{category} 产业链 上游 下游` | `{category} 市场概况 产业链` | 行业研究 |
| `{category} 市场规模 增长率` | `{category} 市场规模 报告 数据` | 咨询报告 |
| `{category} 行业趋势` | `{category} 发展趋势 现状` | 行业分析 |
| `{category} 市场机会 投资 前景` | `{category} 市场前景 投资` | 投融资分析 |

## 预期效果

- fetch 阶段：~40s → ~12-18s（约 60% 提速）
- 有效页面占比提升（403 减少）
- 整体 market_research 约 **50-60% 提速**，接近 product_research 的耗时水平

## 影响范围

只修改 `market_research_agent.py`（Semaphore、超时、搜索词、屏蔽域名），不涉及其他 agent 或服务。

## 不修改的范围

- 输出 schema（`MarketResearchOutput`、`MarketTrend` 等不变）
- LLM 提取逻辑（`_extract` 函数不碰）
- 其他 agent 的行为
