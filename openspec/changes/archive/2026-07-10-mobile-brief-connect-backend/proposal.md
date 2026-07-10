## Why

移动端工作台 ② 简报屏（ScreenBrief）和 ③ 方案生成屏（ScreenGenerate）目前是纯静态 HTML mockup，没有后端数据驱动。简报表单字段无法提交、核心策略不支持 AI 辅助优化、"AI 生成方案"按钮无效果、方案生成屏的流水线状态和方案内容均为硬编码。需要打通后端，使移动端能像 PC 端一样走完整 agent 工作流生成营销方案。

## What Changes

- **ScreenBrief（② 简报）**：表单字段绑定 state，提交时构造扩展版 `brand_input` 发送到后端
- **核心策略 AI 优化**：新增后端轻量端点 `POST /plan/strategy-optimize`，接收品牌/品类/目标等表单数据，返回 LLM 生成的核心策略文案，点击 AI 图标填充到 textarea
- **"AI 生成方案"按钮**：收集简报表单数据，调用 `POST /plan/run` 启动 agent 工作流，SSE 流式接收进度
- **ScreenGenerate（③ 方案生成）**：新增前端 `useMobilePlanRun` hook（轻量版），接收 SSE 事件更新流水线 status/steps/chapters，展现实时流水线进度和最终方案内容
- **后端 brand_input 扩展**：后端 `plan_generation_service.py` 的 `brand_input` 支持额外字段：`product_matrix`（产品矩阵）、`target_audience`（目标人群）、`marketing_goal`（营销目标）、`core_strategy`（核心策略）、`selected_cities`（首批城市列表）
- **Checkpoint 处理**：移动端也支持 checkpoint 暂停展示，以优雅对话框形式让用户确认继续或驳回重跑
- **底部按钮**：方案生成完成后底部按钮跳转到 ④ 行动建议屏

## Capabilities

### New Capabilities
- `mobile-brief-connect`: 移动端简报页与后端打通，包含表单提交、AI 策略优化、agent 工作流触发、SSE 事件消费、checkpoint 审核对话框

### Modified Capabilities
- `mobile-workbench-preview`: ② 简报屏和 ③ 方案生成屏从纯静态 mockup 变更为后端数据驱动的动态屏；新增 useMobilePlanRun hook 管理移动端流水线状态

## Impact

| 层面 | 影响 |
|------|------|
| 后端 API | 新增 `POST /plan/strategy-optimize` 端点；`POST /plan/run` 的 `brand_input` 字段扩展 |
| 后端 Service | `plan_generation_service.py` 的 `brand_input` schema 扩展以接收新字段并传递给 downstream agents |
| 前端 ScreenBrief | 表单从 uncontrolled defaultValue 改为 controlled state，提交、AI 优化、跳转三路逻辑 |
| 前端 ScreenGenerate | 从静态 mockup 改为 SSE 事件驱动的动态组件 |
| 前端 Hooks | 新增 `useMobilePlanRun` hook（轻量版，不处理 checkpoint 暂停细节） |
| 规范 | 更新 `openspec/specs/mobile-workbench-preview/spec.md` 的 Requirements（② ③ 屏行为变更） |
