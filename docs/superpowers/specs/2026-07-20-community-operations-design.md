# 社群运营规划 capability — Brainstorming Design Doc

> 状态：草稿（待 /opsx:explore 澄清）
> 日期：2026-07-20
> 触发：用户希望药丸增加"社群运营"入口，基于品类/城市给出社群运营规划建议

## 1. 现状

superpowers.yaml 已新增 `community-operations` in_scope。目前 mock 数据中与社群相关的字段：

| 字段 | 来源 | 数据形态 |
|------|------|----------|
| `leaderboard.leaderboard_types` | allygo_city_data.json | `经营号活跃榜（周榜）`等 |
| `stores.count` / `stores.categories` | allygo_city_data.json | 门店数量 + 品类 |
| `leagues.top_leagues` | allygo_city_data.json | 社团列表（如沪跑团、蓉城跑团） |
| `cooperation_center.recruitments[*].requirements` | allygo_city_data.json | "有运动场馆或社群资源"、"具备本地社群运营能力" |
| `venues.types` | allygo_city_data.json | 社区运动场、瑜伽馆、健身房等场地 |

**目前缺少专门的"经营社"数据**，但可以从上述字段组合推导出足够的社群运营上下文。

## 2. 架构设计

### 2.1 意图识别

**新意图**：`community_operations`

**所需字段**：
- `category`（品类）— 必填，如"运动鞋"、"瑜伽服"
- `city`（城市）— 必填

**多轮流程**（与 activity_planning / alliance_planning 完全一致的模式）：
```
用户："帮我规划社群运营"
→ reply：好的，帮您规划社群运营。还需要了解：品类、城市

用户："瑜伽服，上海"
→ 字段齐全，确认 reply + "开始规划"按钮
```

### 2.2 数据来源

MVP 阶段从 `allygo_city_data.json` 提取：

| 社群维度 | mock 数据来源 | 用途 |
|----------|-------------|------|
| 现有社团 | `leagues`（社团数量 + top_list + avg_members） | 社群竞品/合作对象参考 |
| 门店基础 | `stores`（门店数量 + 品类分布） | 社群运营的线下据点 |
| 场地资源 | `venues`（场地类型 + 容量） | 社群活动场地 |
| 活跃激励 | `leaderboard`（榜单 + 奖励） | 运营激励机制参考 |
| 达人资源 | `influencers`（达人分布 + 报价） | KOL 合作 |
| 人群特征 | `population / consumption / personas` | 社群定位参考 |

**补充 mock 数据**（如果现有数据不够）：在 `mock_data/community_operations/` 下新增一个轻量社区运营模板 JSON，包含：

```json
{
  "community_types": ["品牌粉丝群", "运动兴趣群", "会员福利群", "活动打卡群"],
  "content_topics": ["运动技巧", "产品测评", "用户故事", "活动预告"],
  "engagement_formats": ["打卡挑战", "积分兑换", "线下体验", "KOL 直播"],
  "kpi_reference": {"active_rate": "35-50%", "retention_30d": "60%", "conversion": "5-8%"}
}
```

**ponytail**：MVP 只用 allygo_city_data.json + 一个轻量 JSON 模板。不引入独立数据库。升级路径：运营数据量增长后再考虑独立数据层。

### 2.3 SSE 流

```
event: status    data: {"step": "query_city", "message": "正在查询上海社群数据…"}
event: status    data: {"step": "analyze", "message": "正在分析社群定位…"}
event: status    data: {"step": "content_plan", "message": "正在规划内容策略…"}
event: status    data: {"step": "suggestion", "message": "正在生成运营建议…"}
event: result    data: {"community_operations_id": "co-abc12345", ...}
```

### 2.4 结果持久化

文件：`mock_data/community_operations/results/co-<uuid8>.json`

```json
{
  "category": "瑜伽服",
  "city": "上海",
  "community_positioning": "专注都市女性瑜伽爱好者的品牌社群",
  "target_members": "25-35岁瑜伽爱好者，偏女性",
  "content_plan": [
    {"type": "每周打卡", "description": "瑜伽体式打卡 + 积分累积", "frequency": "每周二"},
    {"type": "KOL 直播", "description": "邀请瑜伽达人在线带练", "frequency": "双周"}
  ],
  "operations": [
    {"activity": "新品体验官", "goal": "拉新 200 人"},
    {"activity": "线下瑜伽沙龙", "goal": "到店体验 50 人"}
  ],
  "kpi_targets": {"active_rate": "40%", "member_count_3m": "500"},
  "suggestion": "建议以 21 天瑜伽打卡作为冷启动活动…"
}
```

### 2.5 入口卡

与 activity_planning / alliance_planning 一致：

- 社群定位一句话
- 运营活动数量摘要（"规划了 3 项运营活动"）
- 一句话 LLM 建议
- "查看社群运营详情"按钮

### 2.6 详情页

复用 ScreenBudgetAssessment 模式：

- **社群定位卡片**：定位描述 + 人群画像
- **内容规划卡片**：每项内容的类型/描述/频次
- **运营活动卡片**：活动名称 + 目标
- **KPI 目标卡片**：活跃率/留存/转化等
- **一句话建议**（LLM 生成）

## 3. 关键设计决策

### 数据策略（岔路 A vs B）

**岔路 A（推荐）**：`allygo_city_data.json` 现有字段 + 一个轻量运营模板 JSON。假设城市数据中提到的"经营号活跃榜"意味着平台已有经营号生态。

**岔路 B**：在 `mock_data/` 下建完整的`community_operations_schema.json`，包含经营社详细数据（成员数、活跃度、运营者信息）。更完整但 MVP 过重。

### 与"创建盟域"的差异

| 维度 | 创建盟域 | 社群运营 |
|------|----------|----------|
| 核心 | 线下合作/招募/达人矩阵 | 线上社群内容/活动/互动 |
| 数据 | 盟域招募 + 达人 | 经营号 + 门店 + 社团 |
| 输出 | 招募计划 + 达人组合 | 内容规划 + 运营活动 + KPI |
| 关系 | 盟域可成为社群的线下载体 | 社群可反哺盟域活跃度 |

两个能力互补但不重叠。

## 4. 需 /opsx:explore 澄清的问题

1. 社群运营是否需要独立的经营社 mock 数据（岔路 B），还是组合现有字段 + 运营模板够用（岔路 A - 推荐）？
2. 详情页内容规划建议展示形式：结构化卡片（同盟域）还是 markdown 段落？
3. 是否需要考虑"社群运营→自动建群"的边界？（项目 out_scope 含 campaign-execution，建议 NLP 明确"仅输出规划建议，不自动建群"）
4. 两个新药丸（竞品分析 + 社群运营）是一起做，还是逐个推进？
