# Data Query — 数据查询 Agent

## Purpose

按城市 × 运动类型查询 AllyGo 平台数据（盟域/赛事/达人/经营社/活动），输出带品牌上下文的多维数据包，供下游营销方案生成使用。

## Requirements

1. 支持按 city 查询城市级数据（向后兼容）
2. 支持按 city + brand_name + category 查询带品牌上下文的维度路由数据
3. 支持根据品牌品类从 brand_dimension_map 中读取维度优先级和过滤条件
4. 盟域查询支持 sport_type 过滤、member_count 阈值、排序
5. 达人查询支持 tier 等级过滤、follower_count 阈值
6. 经营社支持按类型（商品/课程/团购）过滤
7. 维度路由结果含 priority 标记（high/medium/low），下游 Agent 可据此决定如何展示
8. 未知品类 fallback 到全量统计摘要

## Scenarios

### 场景 1：跑鞋品牌查询上海数据
- 输入：city="上海", brand_name="Nike", category="跑鞋"
- brand_dimension_map 返回：盟域 focus=high(跑步), 达人 focus=high(至尊/大师), 赛事 focus=high(跑步), 经营社 focus=medium, 场馆 focus=medium
- 输出：盟域只返回跑步相关盟域及 stores，达人只返回至尊/大师级

### 场景 2：运动饮料品牌查询北京数据  
- 输入：city="北京", brand_name="宝矿力", category="运动饮料"
- brand_dimension_map 返回：赛事 focus=high(城市马拉松), 达人 focus=high(明星/精英), 经营社 focus=high(健康食品)
- 输出：突出赛事和达人维度，馆场低优先级只给总数

### 场景 3：无品牌上下文查询
- 输入：city="成都"（无 brand_name/category）
- 输出：全量统计摘要（与旧行为一致）

## Data Sources

- `allygo_city_data.json` — 城市级人口/消费统计（向后兼容）
- `leagues.json` — 盟域实体级数据
- `influencers.json` — 达人实体级数据
- `stores.json` — 经营社商品/课程/团购
- `brand_dimension_map.json` — 品牌→维度映射规则

## Out of Scope

- 人群洞察 Agent 的数据接入（预留接口，后续 change 实现）
- 自然语言→SQL 的语义解析
