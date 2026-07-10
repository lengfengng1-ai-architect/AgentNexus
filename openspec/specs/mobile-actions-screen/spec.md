---
capability: mobile-actions-screen
name: 移动端行动建议屏
description: 展示基于方案内容生成的平台操作建议和外部推广建议
---

## Purpose

将后端方案生成结果（plan_data_query / action_recommendations 等）在移动端行动建议屏中展示，替代原有的硬编码假数据。

## Requirements

### Requirement: 数据从父级下传

移动端行动建议屏的数据由父组件通过 props 传入，而非自己调用 hook。

#### Scenario: 父组件传入 outputs
- **WHEN** 用户完成方案生成，跳转到行动建议屏
- **THEN** ScreenActions 接收 outputs prop
- **AND** outputs 中包含 plan_data_query / strategy_generation / fitness_analysis / action_recommendations 等数据

#### Scenario: 无数据时展示空态
- **WHEN** outputs 数据为空或 action_recommendations 不存在
- **THEN** 显示空态提示"请先在方案生成屏完成方案生成"

### Requirement: 平台操作建议卡片

展示与 AllyGo 平台内操作相关的建议卡片，数据来自 plan_data_query 的各子字段。

#### Scenario: 赛事活动卡片
- **WHEN** primarySport 存在且有 tournament 赛事列表
- **THEN** 展示赛事活动卡片
- **AND** 卡片标题引用具体的赛事名称和运动类型

#### Scenario: 合作招募卡片
- **WHEN** cooperation_center.recruitments 有数据
- **THEN** 展示合作招募卡片
- **AND** 标注招募类型（达人/代理商等）

#### Scenario: 排行榜卡片
- **WHEN** leaderboard 存在且有 KPI 数据
- **THEN** 展示排行榜卡片
- **AND** 引用 KPI 目标和榜单类型

#### Scenario: 奖杯定制卡片
- **WHEN** trophy 有奖杯类型且 primarySport 存在
- **THEN** 展示奖杯定制卡片
- **AND** 引用运动类型和奖杯定制类型

#### Scenario: 促销活动卡片
- **WHEN** sale 或 group_buy 有可用类型
- **THEN** 展示促销活动卡片
- **AND** 列出可用促销方式

#### Scenario: 达人合作卡片
- **WHEN** influencers 存在
- **THEN** 展示达人合作卡片
- **AND** 显示达人总人数和分层数据

### Requirement: 外部推广建议卡片

展示与外部平台（小红书、抖音等）推广相关的建议卡片，数据来自 strategy_generation 和 brand_input。

#### Scenario: 小红书话题营销卡片
- **WHEN** brandName 和 positioning 都存在
- **THEN** 展示小红书话题营销卡片
- **AND** 话题名称使用品牌名+运动场景

#### Scenario: 抖音品牌挑战赛卡片
- **WHEN** brandName 和 marketGoal 都存在
- **THEN** 展示抖音品牌挑战赛卡片
- **AND** 引用营销目标

### Requirement: 保持界面框架

保留现有的 filters / acard / cta-line 结构，不改变整体布局。

#### Scenario: 卡片自适应
- **WHEN** 数据源满足多个卡片条件
- **THEN** 所有符合条件的卡片依次渲染在 feed 容器中
- **AND** 容器自动滚动以适应内容
