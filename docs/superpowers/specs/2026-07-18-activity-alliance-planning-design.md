# 创建活动 + 创建盟域 药丸改造 — Brainstorming Design Doc

> 状态：草稿（待 /opsx:explore 澄清）
> 日期：2026-07-18
> 触发：把创建活动、创建盟域两个药丸套用预算评估模式（多轮 + mock 数据 + 入口卡 + 详情页）
> 注：两个 capability，最终两个独立 OpenSpec change；设计一起做（共享模式）。

## 1. 共享模式（镜像 budget-analysis，复用度 ~80%）

```
药丸发种子消息 → 新意图 → 多轮收字段 → 查 mock 数据 → LLM 聚焦建议 → 持久化(by ID)
  → 聊天入口卡（摘要 + 按钮）→ 点按钮 → 毛玻璃详情覆盖屏（按 ID 拉取）
```

**直接复用**（与 budget-analysis 同构）：
- SSE 流式 service 模板（analyze_stream：进度 + result）
- 结果持久化（JSON-by-ID：`ap-<uuid8>` / `al-<uuid8>`）
- GET 端点按 ID 拉取
- 入口卡组件模式（摘要数字 + 一句话 + 按钮）
- 详情覆盖屏模式（毛玻璃顶栏 + 卡片列表）
- useXxxxStream hook、ChatBubble 分支、MobileWorkbenchPage 覆盖屏接入
- 意图多轮（复用 clarify 收字段，字段齐后触发计算）

**每药丸独有（20%）**：查哪块 mock + 输出卡片布局 + 多轮字段集。

## 2. 创建活动（activity-planning capability）

### 多轮字段
最小 2 字段：**sport_type（运动类型）+ city（城市）**。可选：scale（规模）/ budget（预算）用于筛选/排序。
- 缺字段 → 反问"想做哪类运动？在哪个城市？"

### 查 mock 数据
- `tournament.available_tournaments`：按 sport_type + available_cities 过滤 → 候选赛事（name/scale/frequency/sponsorship_options）
- `events`：monthly / avg_participants / categories（城市活动热度）
- `venues`：count / types / capacity（场馆资源）

### 输出形态
- **入口卡**：匹配到 N 个候选赛事 + 推荐运动 + 一句话建议（LLM，如"推荐冠名'与你争锋·羽毛球公开赛'，月度频次利于持续曝光"）
- **详情页**：候选赛事卡列表（name/scale/frequency/赞助权益）+ 城市活动热度 + 场馆资源

### scope
规划/建议 = in_scope；自动创建活动实体 = out_scope（不做）。

## 3. 创建盟域（alliance-planning capability）

### 多轮字段
最小 2 字段：**category（品类）+ city（城市）**。可选：goal（目标：招募代理/达人合作/盟域加盟）。
- 缺字段 → 反问"做什么品类？在哪个城市？"

### 查 mock 数据
- `leagues`：count / top_leagues / avg_members（盟域资源）
- `cooperation_center.recruitments`：招募计划（title/type/target_count/requirements）
- `influencers`：count / tiers / avg_quote（达人矩阵）

### 输出形态
- **入口卡**：N 个盟域 + 招募岗位 + 一句话建议（LLM，如"上海有342个盟域，建议优先合作沪跑团等头部，达人分层招募"）
- **详情页**：头部盟域推荐 + 招募计划卡（代理/达人 target_count + requirements）+ 达人分层矩阵

### scope
规划/建议 = in_scope；自动建盟域/发邀约 = out_scope（不做）。

## 4. 数据真实性（已验证上海 mock）

- 活动：与你争锋·羽毛球公开赛（200人/场/月度，赞助：冠名30万/围栏5万/补给站3万/奖杯2万/号码牌1万）；events 156/月/86人；venues 234个/综合体育馆等/均420人。
- 盟域：342盟域（沪跑团/上海瑜伽联盟/魔都骑行社/外滩篮球盟，均1280成员）；招募：代理商30个（首批进货≥20万）、达人80个（粉丝≥3000）；达人568位（至尊12/明星48/健将156/达人352，报价1.2万/条）。

所有名称/数值来自 mock，LLM 仅做推荐推理，不编造。

## 5. 意图识别新增

- `activity_planning`：关键词"创建活动/策划活动/办活动"。字段齐（sport_type/city）→ 触发。
- `alliance_planning`：关键词"创建盟域/盟域合作/建盟域"。字段齐（category/city）→ 触发。
- 复用 budget_assessment 的多轮机制（保持意图 + 反问，不翻 clarify）。
- 注意 category 提取：盟域需要 category，已有"X品类"兜底正则 + budget 的"品类清除"守卫，应能复用。sport_type 是新字段——需新增提取规则（运动类型关键词：跑步/羽毛球/瑜伽/篮球/骑行等，或从用户输入自由提取）。

## 6. capability 边界（需人确认 superpowers.yaml）

新增 2 个 in_scope 条目：
- `activity-planning`：基于运动类型/城市，结合 mock 赛事/场馆数据，给出活动规划建议（候选赛事 + 赞助权益 + 场馆），多轮澄清 + 入口卡 + 详情页。仅规划不执行。
- `alliance-planning`：基于品类/城市，结合 mock 盟域/招募/达人数据，给出盟域合作规划建议（盟域推荐 + 招募计划 + 达人矩阵）。仅规划不执行。

## 7. Non-goals

- 不自动创建活动/盟域/发邀约（out_scope）。
- 不替换推荐方案生成（全量 plan 流水线保持）。
- 不改产品海报/视频（生成任务，不同模式）。
- PC 端不动（仅移动端）。

## 8. 推进方式

两个独立 change，建议顺序：
1. **activity-planning**（先做，mock 数据最具体——赛事有赞助权益等结构化输出）
2. **alliance-planning**（后做，模式已稳定，更快）

每个走 propose → apply → archive。第二个可大量复制第一个的结构。
