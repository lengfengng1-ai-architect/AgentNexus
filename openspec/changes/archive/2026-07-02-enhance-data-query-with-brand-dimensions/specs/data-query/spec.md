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
### 场景 2：运动饮料品牌查询北京数据  
### 场景 3：无品牌上下文查询

## Data Sources

- `allygo_city_data.json` — 城市级人口/消费统计（向后兼容）
- `leagues.json` — 盟域实体级数据
- `influencers.json` — 达人实体级数据
- `stores.json` — 经营社商品/课程/团购
- `brand_dimension_map.json` — 品牌→维度映射规则

## Out of Scope

- 人群洞察 Agent 的数据接入（预留接口，后续 change 实现）
- 自然语言→SQL 的语义解析
