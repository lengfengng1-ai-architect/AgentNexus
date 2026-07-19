## Context

第三个药丸改造，镜像 budget-analysis / activity-planning。差异仅在数据源（盟域/招募/达人）+ 字段（category+city，复用 brand_input，不需新 schema 字段）。mock 数据已验证（上海：342盟域/代理招募30个/达人568位分层）。

## Decisions

### D1: 镜像 activity-planning 全流程
SSE + 持久化（al-\<uuid8\>）+ GET + 入口卡 + 毛玻璃详情屏 + hook + ChatBubble 分支 + MobileWorkbenchPage 覆盖屏。

### D2: category+city 复用 brand_input
不需新 schema 字段。category 提取 + "品类清除"守卫已在 budget-analysis 修好。

### D3: 数据查询
leagues（count/top_leagues/avg_members）+ cooperation_center.recruitments（title/type/target_count/requirements）+ influencers（count/tiers/avg_quote）。

### D4: LLM 一句话建议
基于盟域/招募数据推理（如"上海有342个盟域，建议优先合作沪跑团，达人分层招募"）。

## Risks
1. 规模：同 budget/activity，分阶段实现。
2. category 提取稳定性：已有"X品类"兜底正则 + LLM 提取，稳定。
