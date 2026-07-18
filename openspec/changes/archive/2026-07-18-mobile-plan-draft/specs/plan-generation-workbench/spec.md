## MODIFIED Requirements

### Requirement: 移动端顶栏3个点菜单 SHALL 在方案完成时可点击并展示导出选项，图标纯黑色

移动端工作台顶栏的"3个点"（⋯）菜单图标颜色 SHALL 为纯黑色（`var(--fg)`）。菜单 SHALL 仅在方案生成完成（`isExportReady`）时可点击，展示文档导出选项。"方案草稿"功能不在此菜单中，而作为独立的工作台 Tab（见下文）。

#### Scenario: 3个点图标纯黑色
- **GIVEN** 用户在移动端工作台任意屏幕
- **WHEN** 顶栏渲染3个点图标
- **THEN** 图标颜色 SHALL 为纯黑色（`#111111`）

#### Scenario: 仅在方案完成时显示导出选项
- **GIVEN** 用户在 generate 或 preview 屏且方案状态为 `completed`
- **WHEN** 用户点击顶栏3个点
- **THEN** 菜单 SHALL 展示"导出 PDF"和"导出 XLSX"两项

#### Scenario: 方案未完成时3个点不可操作
- **GIVEN** 用户在 chat/brief 屏，或 generate 屏但方案未完成
- **WHEN** 顶栏渲染
- **THEN** 3个点 SHALL 不打开菜单（不展示空菜单）

## ADDED Requirements

### Requirement: 移动端工作台 SHALL 提供方案草稿 Tab

移动端工作台的屏幕切换 Tab 栏 SHALL 新增"⑥ 方案草稿"Tab，与其他 Tab（对话入口/简报/方案生成/行动建议/下发转达）同级。点击该 Tab 直接进入草稿列表屏，无需经过3个点菜单。

#### Scenario: Tab 栏包含方案草稿入口
- **GIVEN** 用户在移动端工作台任意 Tab 屏
- **WHEN** 渲染 Tab 栏
- **THEN** SHALL 显示"⑥ 方案草稿"Tab
- **AND** 该 Tab 始终可见

#### Scenario: 点击 Tab 进入草稿列表
- **GIVEN** 用户点击"⑥ 方案草稿"Tab
- **WHEN** 切换到草稿列表屏
- **THEN** SHALL 渲染草稿列表
- **AND** Tab 栏 SHALL 保持可见（不隐藏）

### Requirement: 移动端 SHALL 提供方案草稿列表屏

草稿列表 SHALL 复用现有 `GET /plan/runs` 接口，过滤 `status === "completed"` 的运行记录。每条草稿展示品牌名、产品线、相对创建时间。列表为空时显示空态。

#### Scenario: 草稿列表项展示
- **GIVEN** 存在已完成的运行记录
- **WHEN** 渲染草稿列表
- **THEN** 每条草稿 SHALL 显示品牌名（来自 `brand_input.brand_name`）
- **AND** SHALL 显示产品线（来自 `brand_input.product_matrix`）
- **AND** SHALL 显示相对创建时间（如"2小时前""昨天"，来自 `created_at`）

#### Scenario: 草稿列表为空
- **GIVEN** 后端无已完成的运行记录
- **WHEN** 草稿列表加载完成
- **THEN** SHALL 显示空态文案"暂无已完成的方案草稿"

### Requirement: 移动端 SHALL 提供方案草稿详情视图（直接读取数据库结果）

点击草稿列表中的某条草稿 SHALL 在同一屏内从右往左滑入详情视图，展示该草稿的方案摘要内容。详情数据 SHALL 直接读取后端 checkpoint 持久化的结构化输出（`GET /plan/runs/{run_id}/status` 返回的 outputs），**不调用 LLM 摘要接口**，避免每次查看重新生成。

#### Scenario: 打开草稿详情
- **GIVEN** 用户在草稿列表屏
- **WHEN** 用户点击某条草稿
- **THEN** 详情视图 SHALL 从右往左滑入（slide-in-right 动画），覆盖列表

#### Scenario: 详情直接读取数据库 outputs
- **GIVEN** 用户打开某条草稿详情
- **THEN** 前端 SHALL 调用 `GET /plan/runs/{run_id}/status`
- **AND** SHALL 直接从返回的 `outputs` 中读取 `strategy_generation` / `budget_kpi` / `action_recommendations` / `execution_planning` 渲染卡片
- **AND** SHALL NOT 调用 `POST /plan/summary`（LLM 摘要）接口

#### Scenario: 详情展示方案摘要卡片
- **GIVEN** 详情数据加载完成
- **WHEN** 渲染详情视图
- **THEN** SHALL 展示策略定位卡片（`strategy_generation.positioning` + `key_messages`）
- **AND** SHALL 展示核心 KPI 卡片（`budget_kpi.kpis` + `allocations`）
- **AND** SHALL 展示执行规划卡片（`execution_planning` 各字段）
- **AND** SHALL 展示行动建议卡片（`action_recommendations.actions`）
- **AND** 卡片样式 SHALL 与方案生成页"生成结果"区域一致

#### Scenario: 详情顶栏提供下载功能
- **GIVEN** 用户在草稿详情视图
- **WHEN** 用户点击详情顶栏的3个点
- **THEN** SHALL 展示"导出 PDF"和"导出 XLSX"菜单项
- **AND** 下载 SHALL 使用该草稿的 `run_id` 调用导出 API

#### Scenario: 从草稿详情返回列表
- **GIVEN** 用户在草稿详情视图
- **WHEN** 用户点击返回按钮
- **THEN** 详情视图 SHALL 从右往左滑出（slide-out-right 动画）
- **AND** 列表视图保持原滚动位置

### Requirement: 草稿详情 SHALL 支持跳转到完整方案或行动建议

草稿详情中的"查看完整方案"和"下一步行动建议"按钮 SHALL 关闭详情并恢复对应草稿的运行状态后跳转到目标 Tab。

#### Scenario: 查看完整方案
- **GIVEN** 用户在草稿详情视图
- **WHEN** 用户点击"查看完整方案"
- **THEN** SHALL 通过 `restoreFromRunId(run_id)` 恢复该草稿的运行状态
- **AND** SHALL 切换到 preview 屏

#### Scenario: 查看下一步行动建议
- **GIVEN** 用户在草稿详情视图
- **WHEN** 用户点击"下一步行动建议"
- **THEN** SHALL 通过 `restoreFromRunId(run_id)` 恢复该草稿的运行状态
- **AND** SHALL 切换到 actions 屏
