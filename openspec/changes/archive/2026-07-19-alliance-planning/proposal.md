## Why

"创建盟域"药丸当前只 send-text 触发全量方案，缺聚焦输出。套用预算评估/活动规划模式：药丸发种子消息 → 多轮收 category/city → 查 mock 盟域/招募/达人数据 → 聚焦输出（头部盟域 + 招募计划 + 达人矩阵）+ 入口卡 + 毛玻璃详情页。第三个药丸改造 capability。

## What Changes

- 新增 capability `alliance-planning`（已在 superpowers.yaml in_scope）
- 意图识别新增 `alliance_planning` 意图（关键词"创建盟域/盟域合作"），多轮收 category + city（复用 brand_input 现有字段 + budget 的 category 提取守卫）
- 字段齐后查 allygo_city_data 的 leagues + cooperation_center + influencers → 头部盟域 + 招募计划 + 达人分层 + LLM 建议
- 结果持久化（JSON-by-ID `al-<uuid8>`）+ GET 端点
- 入口卡 `AlliancePlanningEntryCard` + 详情覆盖屏 `ScreenAlliancePlanning`（毛玻璃）
- 创建盟域药丸 payload 改"帮我创建一个盟域"

## Capabilities

### New Capabilities

- `alliance-planning`: 基于品类/城市，结合 mock 盟域/招募/达人数据，给出盟域合作规划建议。仅规划不执行。

### Modified Capabilities

- `intent-recognition`: 新增 alliance_planning 意图
- `mobile-chat-session`: 创建盟域药丸改种子消息；ChatBubble 新增 alliance 入口卡分支

## Non-goals

- 不自动建盟域/发邀约（out_scope）
- 不改其他药丸/PC
- alliance 用 category+city（复用 brand_input），不需要新 schema 字段
