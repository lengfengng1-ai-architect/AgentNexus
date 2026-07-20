## Context

社群运营规划是新 capability。目前平台 mock 数据（allygo_city_data.json）已有社团（leagues）、门店（stores）、场地（venues）、达人（influencers）、经营号活跃榜（leaderboard）、招募需求（cooperation_center）等社群相关字段，但缺少经营社实体数据。MVP 策略：组合现有字段 + 新增一个轻量经营社 mock 数据文件。

已有基建可复用：
- SSE 流模式（`asyncio.Queue` + `make_emit`）在 budget/activity/alliance 三药丸中成熟
- 意图识别多轮 + `_normalize_intent_output` 模式已定型
- 入口卡 + 毛玻璃详情页 + slide-in-right 转场有完整模板
- mock 数据查询模式在 activity_planning_service.py / alliance_planning_service.py 中已定型

## Goals / Non-Goals

**Goals:**
- 用户说"帮我规划社群运营" → 意图识别为 `community_operations`
- 多轮收集 category（必填）+ city（必填）
- 字段齐后自动触发，查询城市 mock 数据 + 经营社补充数据
- SSE 流式推送进度
- 结果持久化到 `mock_data/community_operations/results/co-<uuid8>.json`，按 ID 取
- 聊天入口卡 + 独立毛玻璃详情页

**Non-Goals:**
- 不自动建群/发消息/执行运营动作
- 不接入外部社群平台（微信/抖音社群等）
- 不包含效果归因

## Decisions

### 1. 数据策略：现有字段 + 轻量补充

**数据来源**：

| 社群维度 | 数据来源 | 在结果中的用途 |
|----------|---------|---------------|
| 现有社团 | `city["leagues"]`（top_leagues/count/avg_members） | 社群竞品/参考对象 |
| 经营号榜单 | `city["leaderboard"]`（leaderboard_types/reward） | 激励机制参考 |
| 门店基础 | `city["stores"]`（count/categories） | 运营据点分布 |
| 场地资源 | `city["venues"]`（types/capacity） | 线下活动场地 |
| 达人资源 | `city["influencers"]`（tiers/avg_quote） | KOL 合作参考 |
| 经营社补充 | `mock_data/community_operations/community_data.json` | 社群类型/内容格式/KPI 参考 |

**补充 mock 文件结构**（`community_data.json`）：
```json
{
  "community_types": ["品牌粉丝群", "运动兴趣群", "会员福利群", "活动打卡群"],
  "content_formats": ["运动技巧图文", "产品测评短视频", "用户故事分享", "活动预告海报"],
  "engagement_methods": [
    {"name": "打卡挑战", "description": "21天运动打卡累积积分"},
    {"name": "积分兑换", "description": "社群积分兑换品牌周边/优惠券"},
    {"name": "线下体验", "description": "品牌门店/场地线下活动"},
    {"name": "KOL 直播", "description": "达人直播带练+互动"}
  ],
  "kpi_reference": {
    "active_rate": "35-50%",
    "retention_30d": "60-70%",
    "conversion_rate": "5-8%",
    "avg_daily_posts": "20-50条"
  }
}
```

**ponytail**: MVP 不做独立经营社数据层，仅一个 JSON 模板。升级路径：运营数据量增长后迁移到独立数据 schema。

### 2. 结果结构

```python
class CommunityOperationsResult(BaseModel):
    category: str                           # 品类
    city: str                               # 城市
    community_positioning: str              # 社群定位
    target_members: str                     # 目标人群
    content_plan: list[ContentPlanItem]     # 内容规划
    operation_activities: list[OperationActivity]  # 运营活动
    kpi_targets: dict[str, str]             # KPI 目标
    suggestion: str                         # 一句话建议

class ContentPlanItem(BaseModel):
    content_type: str       # 内容类型（如"运动技巧图文"）
    description: str        # 内容描述
    frequency: str          # 发布频次

class OperationActivity(BaseModel):
    activity_name: str      # 活动名称
    goal: str               # 目标
    description: str        # 活动说明
```

### 3. SSE 流步序

```
event: status  {"step": "query_city", "message": "正在查询上海社群数据…"}
event: status  {"step": "positioning", "message": "正在分析社群定位…"}
event: status  {"step": "content_plan", "message": "正在规划内容策略…"}
event: status  {"step": "operations", "message": "正在设计运营活动…"}
event: result  {"community_operations_id": "co-abc12345", ...}
```

### 4. 入口卡 + 详情页布局

**入口卡**：
- 品类 + 城市标题
- 社群定位一句话
- 规划摘要（"规划了 N 项内容 + M 项运营活动"）
- LLM 建议
- "查看社群运营详情"按钮

**详情页**：
- 毛玻璃 topbar → 返回按钮
- 社群定位卡片（定位 + 目标人群）
- 内容规划卡片（列表：类型/描述/频次）
- 运营活动卡片（列表：活动名/目标/说明）
- KPI 目标卡片（活跃率/留存/转化）
- 一句话建议

### 5. 后端架构

复用 activity_planning / alliance_planning 模式：
- `community_operations_service.py`：`analyze_stream()` + `save/get`
- `community_operations.py` 路由：`POST /community-operations/stream` + `GET /community-operations/results/{id}`
- 数据来源：`allygo_city_data.json[city]` + `community_data.json`
- LLM 生成 suggestion：复用 Jinja2 prompt 模板模式

## Risks / Trade-offs

- **[数据覆盖]** 经营社补充数据是通用模板，非城市个性化 → MVP 阶段可接受，社区定位 + 目标人群分析本身由城市 mock 数据 + LLM 推理产生，模板提供格式参考而非数据
- **[与盟域重叠]** 社群运营和盟域规划都涉及"社团"数据 → 在设计上明确区分：盟域→线下合作/招募/达人矩阵；社群→线上内容/活动/互动
- **[建议偏泛]** LLM 基于有限 mock 数据生成的运营建议可能偏通用 → 通过增加品类维度（运动鞋 vs 瑜伽服的策略明显不同）增强针对性

## Open Questions

1. 经营社补充数据是否需要按城市区分？MVP 暂统一模板，不区分城市。（不同城市的经营社类型应是相似的，差异来自城市数据中的社团/门店/达人等实体数据）
