## Context

"创建活动"药丸套用预算评估模式（budget-analysis 已验证）。这是药丸多轮化第二个 capability。设计高度镜像 budget-analysis（SSE+持久化+入口卡+详情页），差异仅在数据源（赛事/场馆）+ 字段（sport_type/city）+ 输出布局。

mock 数据（allygo_city_data.json 按城市）：tournament.available_tournaments（name/sport_type/scale/frequency/available_cities/sponsorship_options）、events（monthly/avg_participants/categories）、venues（count/types/capacity）。已验证上海有"与你争锋·羽毛球公开赛"等真实结构化数据。

## Goals / Non-Goals

**Goals:**
- 创建活动药丸 → 多轮收 sport_type/city → 赛事过滤 + 聚焦输出（入口卡 + 详情页）
- 镜像 budget-analysis 模式，最大化复用
- sport_type 由 LLM 提取（新 IntentRecognitionOutput 字段）

**Non-Goals:**
- 不自动创建活动（out_scope）
- 不做 alliance-planning（下一个 change）
- 不改其他药丸/PC

## Decisions

### D1: 镜像 budget-analysis 全流程
SSE service + 持久化（ap-\<uuid8\>）+ GET 端点 + 入口卡 + 毛玻璃详情屏 + stream hook + ChatBubble 分支 + MobileWorkbenchPage 覆盖屏。结构与 budget-analysis 同构。

### D2: sport_type 新增 IntentRecognitionOutput 字段
brand_input 无 sport_type。新增 `sport_type: str | None`（像 market_name 那样的专用字段），LLM 提取。前端在 context 传递、stream 使用。不污染 brand_input。

### D3: 赛事过滤 + 降级
tournament.available_tournaments 过滤：sport_type 命中（sport_type 字段或 name 含）且 available_cities 含 city。无匹配 → 该城市全部赛事 top 3 + 注明"无精确匹配，以下为推荐"。不编造赛事。

### D4: 多轮复用 budget_assessment 机制
activity_planning 字段缺失时保持意图 + 反问（不翻 clarify，避免被后面的 clarify 回复覆盖——同 budget 修法）。字段齐后触发。

### D5: LLM 一句话建议
基于已匹配赛事数据推理（如"推荐冠名'与你争锋·羽毛球公开赛'，月度频次利于持续曝光"）。不编造赛事/数据。

### D6: 入口卡 + 详情页布局
- 入口卡：{sport}活动规划 + N 候选赛事 + top 赛事（name/scale）+ 建议 + 按钮
- 详情页：候选赛事卡列表（scale/frequency/sponsorship chips）+ 城市活动热度 + 场馆

## Risks

1. **sport_type 提取稳定性**：LLM 可能不提取。无兜底正则（运动类型太多样），靠 LLM + 反问多轮补全。可接受（缺则反问）。
2. **赛事匹配为空**：降级返回城市全部 top 3（D3），不阻塞流程。
3. **规模**：本 change 与 budget-analysis 同规模，分阶段实现（先后端闭环，再前端入口卡+详情页）。
