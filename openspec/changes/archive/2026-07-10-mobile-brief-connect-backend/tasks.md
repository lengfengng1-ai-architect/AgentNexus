## 1. API 定义层

- [x] 1.1 在 `docs/api/paths/plan.yaml` 中为 `POST /plan/strategy-optimize` 添加 OpenAPI 端点定义（request/response schema）
- [x] 1.2 在 `docs/api/paths/plan.yaml` 中为 `POST /plan/run` 的 `brand_input` 添加扩展字段定义（product_matrix / target_audience / marketing_goal / core_strategy / selected_cities，均为 optional）

## 2. 后端：策略优化端点

- [x] 2.1 在 `backend/app/schemas/plan_run.py` 新增 `StrategyOptimizeRequest` Pydantic model（brand_name / category / product_matrix / target_audience / marketing_goal 字段）
- [x] 2.2 在 `backend/app/schemas/plan_run.py` 新增 `StrategyOptimizeResponse` Pydantic model
- [x] 2.3 新增 prompt 模板 `backend/app/prompt_templates/strategy_optimize.md.j2`，定义策略优化的 LLM 指令（基于品牌/品类/目标生成核心策略文案）
- [x] 2.4 在 `backend/app/routers/plan.py` 新增 `POST /plan/strategy-optimize` 路由（接收请求 → 调用 LLM → 返回策略文案）
- [ ] 2.5 编写 `test_plan_strategy_optimize.py` 测试 200/400/422/500 响应

## 3. 后端：brand_input 扩展

- [x] 3.1 修改 `backend/app/services/plan_generation_service.py` 中的 `start_run`，确认额外字段正常透传给 StateGraph 的初始 state
- [x] 3.2 检查下游 Agent 读取 brand_input 的逻辑，确保新字段不会导致 key error（所有读取都通过 `state.get("brand_input", {}).get("field")` 方式安全读取）

## 4. 前端：useMobilePlanRun hook

- [x] 4.1 创建 `frontend/src/hooks/useMobilePlanRun.ts`，定义 state 类型（status / steps / outputs / chapters / pausedSnapshot / error / isConnected）
- [x] 4.2 实现 SSE 事件处理（从 `readSSEStream` 解析 event → dispatch 状态变更）
- [x] 4.3 暴露 `start(brandInput)` 方法：调用 `POST /plan/run` 获取 SSE 流，更新步骤和状态
- [x] 4.4 暴露 `approve()` 方法：调用 `POST /plan/runs/{run_id}/approve` 继续流水线
- [x] 4.5 暴露 `reject(reason)` 方法：调用 `POST /plan/runs/{run_id}/reject` 驳回重跑
- [x] 4.6 暴露 `restoreFromRunId(runId)` 方法：刷新页面后恢复运行态
- [ ] 4.7 编写 `useMobilePlanRun.test.ts` 测试

## 5. 前端：ScreenBrief 改造

- [x] 5.1 ScreenBrief 表单字段从 `defaultValue` 改为 `useState` controlled state
- [x] 5.2 核心策略 textarea 右侧添加 AI 图标按钮（loading + error 态）
- [x] 5.3 实现 AI 优化策略逻辑：调用后端 `/plan/strategy-optimize` → 填充 textarea
- [x] 5.4 实现"AI 生成方案"按钮逻辑：收集表单 → onNavigate('generate') → 触发 useMobilePlanRun.start()
- [x] 5.5 添加品牌非空校验，空时显示提示不跳转

## 6. 前端：ScreenGenerate 改造

- [x] 6.1 从 5 步 mock 改为 10 步 Agent 节点动态渲染（从 PC 端的 PIPELINE_NODES 常量获取），保持现有竖线 + 圆形 dot 样式
- [x] 6.2 接收 ScreenBrief 传递的 brand_input，自动调用 useMobilePlanRun.start()
- [x] 6.3 节点状态绑定使用 MobilePlanRun 的 steps state（pending/running/completed/failed/waiting），状态图标和颜色跟随变化
- [x] 6.4 每个 Agent 节点标题下方渲染描述短句（即 PC 端 PipelineTimeline 的 agent.desc 字段），样式复用现有 `.sd` 类（11px, --muted）
- [x] 6.5 描述短句随节点状态动态变化：pending 显示静态文案、running 显示最新日志摘要、completed 固定为总结性描述
- [x] 6.6 实现点击任一 Agent 节点展开/收起操作日志卡片的交互（点击展开 → 日志卡片从节点下方自然滑出；再次点击收回）
- [x] 6.7 当前执行中的 Agent 节点自动展开日志卡片；日志行使用 emoji 前缀、--surface 底色、11px sans-serif
- [x] 6.8 连接节点的竖线（.step::before）随日志卡片展开/收起自动适配高度（absolute 定位跟随父元素高度变化）
- [x] 6.9 流水线完成后渲染方案内容卡片（从 chapters 中提取关键内容），复用现有 plancard 样式
- [x] 6.10 流水线完成前底部隐藏CTA；完成后显示渐变 CTA「下一步行动建议」

## 7. 前端：Checkpoint 审核面板

- [x] 7.1 在 ScreenGenerate 中实现全屏模态审核面板（收到 workflow.paused 事件时上滑弹出）
- [x] 7.2 面板展示：暂停节点名称 + 上游完成节点摘要 + 「确认继续」/「驳回重跑」按钮
- [x] 7.3 确认继续调用 MobilePlanRun.approve()，关闭面板继续流水线
- [x] 7.4 驳回时面板内展开输入框让用户输入原因，确认后调用 MobilePlanRun.reject(reason)

## 8. 测试与验证

- [x] 8.1 运行 `uv run pytest -v` 确认后端测试全绿
- [x] 8.2 运行 `npm test` 确认前端测试覆盖率达标
- [ ] 8.3 手动验证完整链路：ScreenBrief 填写 → AI 优化策略 → 生成方案 → 流水线执行 → checkpoint 审核 → 方案展示
