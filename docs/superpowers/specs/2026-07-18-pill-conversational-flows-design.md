# 药丸快捷入口 → 意图识别多轮问答 + mock 数据建议 — Brainstorming Design Doc

> 状态：草稿（待 /opsx:explore 澄清）
> 日期：2026-07-18
> 触发：用户希望药丸快捷入口从"直达/预填"改成"多轮问答 + 结合 mock 数据给建议"

## 1. 现状

药丸（sg-scroll）当前 `handlePromptClick` 直达路由：

| 药丸 | 当前行为 | 问题 |
|------|----------|------|
| 推荐方案生成 | 跳简报屏（结构化表单） | 不是对话式 |
| 预算评估 | 填模板"我是[品牌]，属于[品类]..."到输入框 | 用户得手动填完发送 |
| 市场分析 | 填"我要对[产品]进行市场分析" | 同上 |
| 创建盟域 | send-text "帮我创建一个盟域活动方案" | 发一句，意图→clarify 收 5 字段→全量方案 |
| 创建活动 | send-text "帮我策划一个品牌营销活动" | 同上 |
| 产品海报 | 直达 addVirtualMessage（生图） | 不经对话 |
| 产品视频 | 直达 addVirtualMessage（生视频） | 不经对话 |

**用户期望**：药丸作为对话入口，启动意图识别多轮问答，逐步问清需求，结合系统 mock 数据给出**聚焦的建议/规划**（不是每次都走全量 9 章方案）。

## 2. 可用基建（已存在，可复用）

- **intent_recognition**：已有 `clarify` 意图——多轮收集 brand_name/category/city/budget/period，缺啥反问啥；字段齐 → generate_plan。
- **query_data** 意图 + `DataQueryOutput`：按城市返回 mock 数据摘要（含 dimension_priorities）。
- **mock 数据**（`backend/mock_data/`）：
  - `allygo_city_data.json`：按城市的 population/sport_index/consumption/leagues/events/influencers/stores/venues/tournament/trophy/cooperation_center/leaderboard/group_buy/sale。
  - `plan_budget_kpi.json`：预算分配（达人合作/内容制作/活动执行/平台投放/运营资源的 percentage/amount）+ KPI（曝光/互动/线索/转化）+ timeline。
  - `leagues.json`/`influencers.json`/`stores.json`：可按 city/sport_type/tier 过滤的实体列表。
- **plan 流水线**：plan_data_query → fitness_analysis → strategy_generation → execution_planning（含 events_plan/leagues_plan/influencer_plan）→ budget_kpi → action_recommendations → plan_generator。

## 3. 核心设计岔路（待 /opsx:explore 定）

### 岔路 A：聚焦轻量流（每药丸独立多轮 + 聚焦输出）
- 预算评估 → 独立"预算评估流"：多轮问品类/产品、预算、周期、城市 → 查 mock 成本数据（达人报价/盟域费用/促销佣金）→ 返回**预算分配建议**（复用 plan_budget_kji 结构）。
- 创建活动 → 独立"活动规划流"：多轮问运动类型/城市/规模 → 查 mock（赛事/场馆/活动类型）→ 返回**活动方案建议**。
- 优点：输出聚焦、快、贴用户意图。
- 代价：每流要新意图 + 新响应生成逻辑（查哪些 mock、怎么组织回复）。

### 岔路 B：复用 generate_plan，药丸定调
- 所有"规划类"药丸统一走 clarify → 全量 plan 流水线；药丸只决定**先问哪个字段 / 方案如何定调**（如预算评估优先问预算，创建活动优先问活动类型）。
- 优点：零新后端能力，复用全量流水线（天然含预算评估=budget_kpi、活动规划=execution_planning）。
- 代价：每次都出全量 9 章方案，重；用户要的是"聚焦评估"不是"全套方案"。

### 岔路 C（推荐）：混合——药丸发种子消息，意图决定深浅
- 药丸 → 发一条种子消息（send-text）。
- 意图识别判断：是"轻量评估"（预算评估/活动规划）还是"全量方案"（推荐方案生成）。
  - 轻量评估：多轮收**该聚焦所需的最小字段**（非全 5 字段）→ 查对应 mock 子集 → 返回聚焦建议卡（如预算分配条形图、活动候选列表）。
  - 全量方案：走现有 clarify → generate_plan。
- 海报/视频药丸保持直达（它们本就是生成任务，非规划）。
- 优点：贴用户"聚焦建议"意图；复用 clarify 多轮机制 + mock 数据；按需扩展。

## 4. scope 边界（必须厘清）

- superpowers.yaml `out_scope` 含 `campaign-execution`（方案自动执行：**创建活动、发送达人邀约**）。
- 用户要的是"**给用户规划下**"（建议/方案），**不是在系统里自动创建活动**。
- **结论**：规划/建议/评估 = in_scope（plan-generation / 数据驱动建议）；自动创建活动实体 = out_scope，不做。需在 proposal Non-goals 明确"不自动创建活动/不下单/不发送邀约，只输出规划建议"。

## 5. capability 归属（待定）

- 预算评估：归入 plan-generation（复用 budget_kpi），还是新 capability `budget-analysis`？
- 活动规划：归入 plan-generation（复用 execution_planning），还是新 capability `activity-planning`？
- 倾向：MVP 归入 plan-generation（复用现有流水线节点 + mock），不新建 capability，避免过度抽象。

## 6. 建议推进方式（分阶段）

1. **Pilot：预算评估药丸**做端到端（药丸发种子消息 → 意图识别为预算评估 → 多轮收品类/预算/周期/城市 → 查 mock 成本 + plan_budget_kpi → 返回预算分配建议卡）。
2. 验证交互模式 + 聚焦输出形态，再扩展到创建活动、创建盟域。
3. 推荐方案生成、市场分析、海报/视频暂不动。

## 7. 待 /opsx:explore 澄清的问题

1. 选岔路 A / B / C？（我倾向 C）
2. Pilot 选预算评估还是创建活动先做？
3. 预算评估的"聚焦输出"具体形态？（预算分配条形图 + KPI 预估 + 一句话建议？还是 markdown 段落？）
4. 多轮问几轮、每轮问什么字段（最小必要集）？
5. capability 归属：复用 plan-generation 还是新建？
