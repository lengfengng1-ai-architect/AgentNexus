## Why

行动建议（action_recommendations）节点执行完成后，用户需要预览生成的行动建议详情，确认后再继续方案生成。此前该节点没有结果弹窗，用户看不到行动建议的具体内容，也无法给出修改意见后重新生成。

## What Changes

- **后端**：`action_recommendations` 节点加入 `interrupt_after`，执行完后暂停展示结果弹窗；Pydantic schema 加 `start_date`/`end_date`/`priority`/`category` 字段；`_node_inputs` 传递 `execution_planning` 数据；海报生成从 `plan_generator` 提前到 `action_recommendations`；`reject_run` 区分 action_recommendations 驳回场景
- **前端**：新建行动预览全屏覆盖层（`ScreenActionPreview.tsx`），展示行动建议卡片 + 媒体素材状态 + 底部反馈输入；`ScreenGenerate.tsx` 弹窗加 action_recommendations 分支；`MobileWorkbenchPage.tsx` 加 action-preview 路由/状态/动画；`MobileScreen` 类型扩展

## Capabilities

### New Capabilities
- `action-preview-ui`: 移动端行动建议预览覆盖层，含行动卡片/日期/优先级/媒体素材/反馈输入

### Modified Capabilities
- `plan-generation`: action_recommendations 节点行为变更——执行后暂停、输出字段扩展、接入 execution_planning 输入

## Impact

- `backend/app/schemas/plan_generation.py` — ActionRecommendation 加字段
- `backend/app/prompt_templates/action_recommendations.md.j2` — 时间/执行规划/驳回反馈注入
- `backend/app/agents/action_recommendations_agent.py` — 接 execution_planning 输入 + 驳回反馈
- `backend/app/services/plan_generation_service.py` — interrupt_after + poster 触发时机 + reject_run 分支
- `frontend/src/types/plan.ts` — PlanOutputs 类型
- 新建 `frontend/src/pages/mobile-workbench/ScreenActionPreview.tsx`
- `frontend/src/pages/mobile-workbench/ScreenGenerate.tsx` — 弹窗分支
- `frontend/src/pages/mobile-workbench/MobileWorkbenchPage.tsx` — 路由/状态
- `frontend/src/pages/mobile-workbench/ScreenChat.tsx` — MobileScreen 类型
- `frontend/src/pages/mobile-workbench/mobile-workbench.css` — 滑动动画
