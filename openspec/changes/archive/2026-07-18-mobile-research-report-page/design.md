# Design: 移动端调研结果页

Corresponding in_scope ID: `market-analysis`

## Context

移动端聊天触发 market_research 后，当前实现：

- **进行中**：气泡内 `MarketResearchProgressCard`（搜索状态条 + 进度日志滚动窗口）—— 用户可接受，保留
- **完成后**：气泡直接 `dangerouslySetInnerHTML` 渲染 `full_report` markdown（通常 3000+ 字）—— 用户反馈太丑，且聊天消息全量持久化到 localStorage，一条调研消息的 result 实测 9-12KB，刷新后长报告再次撑爆聊天

已有可复用资产：

- 后端 `market_analysis_service._save_cache` 已按 market_name 落盘 JSON 缓存（仅同步接口用，流式不落盘）
- 前端 `MarketResearchResultCards` 已有完整的结构化板块渲染（摘要/规模/趋势/用户/竞品/机会/报告/证据），当前移动端无人调用
- 前端 budget-preview / action-preview 已验证"手机框内绝对定位覆盖层 + 从右往左 slide-in/out"模式（`bp-slide-in` 动画 + 300ms 时序 + suppress 状态机）

约束：

- 数据引用规则：所有调研数据必须来自后端返回，前端只渲染不生成
- 样式隔离：移动端新样式必须 `.mw` 作用域，PC 端 Tailwind 样式不受影响
- 仅改移动端聊天完成态，PC 端保持现状

## Goals / Non-Goals

**Goals:**

1. 移动端调研完成后，聊天气泡只显示摘要卡片（市场名 + 关键数字 + 机会评估 + 入口按钮）
2. 点按钮进入毛玻璃结果页（覆盖屏），从右往左 slide-in，‹ 返回 slide-out
3. 结果页展示完整结构化板块 + 完整报告 + 证据来源
4. 刷新后按钮仍可用（结果后端持久化 + 按 ID 拉取）
5. 缺数据字段优雅降级（缺哪个板块不渲染哪个）

**Non-Goals:**

- 不改 PC 端聊天完成态
- 不改调研进行中的过程展示
- 不做结果页 URL 路由 / 分享
- 不做结果过期清理（MVP 文件永久保留）
- 不引入数据库 / Redis（沿用文件缓存惯例）

## Decisions

### D1: research_id 用 UUID 而非 market_name slug

**选择**：`mr-<uuid8>`（如 `mr-3f8a2b1c`），每次调研生成新 ID，结果存 `backend/mock_data/market_analysis/results/<research_id>.json`。

**替代方案**：market_name slug（与现有 `_save_cache` 同源）。
**否决理由**：同一市场重复调研会互相覆盖，用户连续两次调研同一主题后，第一条消息的按钮会打开第二次的报告 —— 张冠李戴。UUID 无此问题。

**附加收益**：现有 `_save_cache` 路径保持不变（同步接口缓存不受影响），新 results 目录独立。

### D2: 存储用 JSON 文件，不用数据库

**选择**：沿用 `_save_cache` 同款 JSON 落盘。

ponytail: 天花板是单实例部署（多实例不共享文件系统）和无 TTL 清理；升级路径是换 Redis/DB 时只需改 service 层两个函数（save/get），接口契约不变。

### D3: 覆盖屏数据"总是从后端拉取"，不做本地优先

**选择**：点按钮 → 覆盖屏骨架屏 → `GET /market-analysis/results/{id}` → 渲染。

**替代方案**：本地消息里有 result 就先渲染、后台再校验。
**否决理由**：两条数据路径 = 数据闪现替换 + 双倍测试面；本地 result 只用于聊天摘要卡片（轻量字段），完整渲染永远单一来源。

### D4: SSE result 事件加字段而非改现有字段

**选择**：`result` 事件 payload 顶层新增 `research_id`，其余结构不变。

向后兼容：旧前端忽略新字段无影响；新前端拿 ID 拉取。非 BREAKING。

### D5: 覆盖屏复用 budget-preview 转场模式

**选择**：`position:absolute inset:0; zIndex:40` 覆盖层 + `rr-slide-in/out`（与 `bp-slide-in/out` 同参数 300ms）+ `isRrAnimatingOut` 状态机 + `handleBack` 映射 `'research-report' → 'chat'`。

**理由**：模式已被 budget-preview / action-preview 验证，用户已体验过同款动画，认知一致。

### D6: 结果页复用 MarketResearchResultCards 子卡片 + 毛玻璃皮肤，不重写渲染

**选择**：`ScreenResearchReport` 直接渲染 `MarketResearchResultCards`（传 `variant="mobile"`），外层包 `.mw .mrr-*` 作用域 CSS 提供毛玻璃质感（半透明白底 + backdrop-filter blur）；缺数据的板块组件内部已有不渲染逻辑。

**替代方案**：为移动端重写一套板块组件。
**否决理由**：重复 300+ 行渲染逻辑，后续字段变化要双份维护；皮肤层覆盖满足视觉需求。

### D7: 摘要卡片数据从消息的 marketResearchResult 提取，不从后端拉

摘要卡片只需 3-5 个轻量字段（market_name、TAM、CAGR、机会评估三档），这些在 SSE result 到达时已随消息存下，无需再请求后端。完整数据才走 GET。

## Risks / Trade-offs

- **[UUID 文件无限增长]** → MVP 接受；后续加 TTL 清理任务（trade-off 已记录在 Non-goals）
- **[GET 端点被刷枚举 ID]** → ID 含 8 位随机 hex（16^8 ≈ 43 亿空间），且数据本身非敏感（公开市场调研）；MVP 接受，不加密钥
- **[localStorage 里旧消息（本 change 之前的）没有 researchId]** → 这些消息的完成态保持现状渲染（markdown 直渲），不出摘要卡片；新调研消息才有按钮。向后兼容不迁移
- **[流式落盘失败]** → try/except 包裹，失败仅记日志，不影响 SSE result 事件下发（降级为"刷新后 404"，会话内仍可用）
- **[调研过程切走再回来]** → 覆盖屏只是查看态，不持有 SSE 连接；调研中离开聊天屏回来后续跑（现状行为不变）

## Migration Plan

纯增量：新端点 + 新字段 + 新前端屏。旧消息无 researchId 自动走旧渲染路径。无需数据迁移，无回滚步骤（回滚 = revert commit，旧路径仍在）。

## Open Questions

（无 —— research_id 格式、数据获取策略、存储选型均已在探索阶段与用户确认）
