## Context

移动端方案完成页需要展示 4 个卡片（策略定位、执行规划、核心KPI、行动建议）。当前直接从 `useMobilePlanRun` 的 `outputs._xxx` 读取 agent 原始 Pydantic 数据渲染，但 `budget_kpi` 的 `kpis` 字段是 `dict[str, str]`（LLM 输出 key 不固定），`allocations[].category` 也不稳定。需要新增一个后端端点，用 `with_structured_output` 归一化各 agent 输出为固定结构。

## Goals / Non-Goals

**Goals:**
- 新增 `POST /plan/summary` 端点，接收 `run_id`，返回固定结构方案摘要
- 后端从 checkpoint 读取 agent 原始输出，LLM 智能化提炼为前端所需卡片结构
- 前端从直接读 `outputs._xxx` 改为调此端点

**Non-Goals:**
- 不改动 agent pipeline 本身的 Pydantic schema
- 不改动 `useMobilePlanRun` hook 内部数据流
- 不改动 PC 端 PlanPage（如果需要后续再改）

## Decisions

### D1: LLM 仅格式化 vs 智能纠偏

**选择**：智能纠偏（LLM 可以修正 agent 输出中的明显错误，如 `total_budget: 0` 但 `brand_input.budget: 400` 时填入 400）

理由：
- 前端即使用户改了表单重新跑，结果也正确
- prompt 中同时传入 `brand_input` 作为参考，LLM 能识别偏差
- 不增加的延迟（一次 LLM 调用即可完成所有提炼）

### D2: 一次调用 vs 分次调用

**选择**：一次 `with_structured_output` 调用，同时输出所有卡片

理由：
- `PlanSummary` 结构完整（策略+执行+KPI+行动），一次 LLM 调用即可看到全貌
- 4 个卡片数据互不独立时 LLM 决策更一致（如 KPI 与预算分配对应）
- 额外延迟 < 2s，可接受

### D3: 从 checkpoint 读 vs 从 SSE outputs 读

**选择**：后端从 SQLite checkpoint 读（`_checkpoint_state`）

理由：
- `useMobilePlanRun` 的 `outputs` 在切换 Tab 后会被清空（即使 localStorage 保存了 run_id）
- checkpoint 是持久化存储，不受前端生命周期影响
- 后端已有 `_checkpoint_state` 函数直接可用

## 数据流

```
ScreenGenerate (完成态)
     │
     ├── localStorage 中有 run_id
     │       ↓
     │  GET /plan/summary?run_id=xxx
     │       ↓
     │  后端 _checkpoint_state(run_id)
     │       ↓
     │  读取 strategy/execution/budget/actions 原始数据
     │       ↓
     │  LLM with_structured_output(PlanSummary)
     │       ↓
     │  返回固定结构 JSON
     │
     └── 直接渲染 PlanSummary 卡片
```

## API 设计

### POST /plan/summary

```
Request:
{
  "run_id": "xxx-yyy-zzz"
}

Response 200:
{
  "success": true,
  "data": {
    "strategy": {
      "positioning": "北京人的活力加油站",
      "key_messages": ["运动后喝娃哈哈，满血复活"]
    },
    "kpis": [
      { "name": "曝光量", "target": "≥1亿", "unit": "次" },
      { "name": "私域会员", "target": "≥50万", "unit": "人" }
    ],
    "allocations": [
      { "category": "达人合作", "percentage": 25, "amount": 100 }
    ],
    "execution": [
      { "label": "盟域", "description": "与北京10家商圈共建..." }
    ],
    "actions": [
      { "title": "发起跑者挑战赛", "description": "..." }
    ]
  }
}
```

## 新增 Schema

```python
class KpiItem(BaseModel):
    name: str = Field(..., description="KPI 名称，如'曝光量'")
    target: str = Field(..., description="KPI 目标值，如'≥1亿'")
    unit: str = Field(default="", description="单位，如'次'/'人'/'万元'")

class AllocationItem(BaseModel):
    category: str = Field(..., description="费用类别，如'达人合作'")
    percentage: float = Field(..., description="占比 0-100")
    amount: int = Field(..., description="金额（万元）")

class ExecutionItem(BaseModel):
    label: str = Field(..., description="执行维度，如'赛事'/'达人'")
    description: str = Field(default="", description="执行描述摘要")

class StrategyCard(BaseModel):
    positioning: str = Field(default="", description="核心定位")
    key_messages: list[str] = Field(default_factory=list, description="核心传播信息")

class PlanSummary(BaseModel):
    strategy: StrategyCard = Field(default_factory=StrategyCard, description="策略定位")
    kpis: list[KpiItem] = Field(default_factory=list, description="KPI 列表")
    allocations: list[AllocationItem] = Field(default_factory=list, description="预算分配")
    execution: list[ExecutionItem] = Field(default_factory=list, description="执行规划")
    actions: list[ActionItem] = Field(default_factory=list, description="行动建议")

class PlanSummaryRequest(BaseModel):
    run_id: str = Field(..., description="运行实例 ID")
```

## 前端改造

- ScreenGenerate 完成态时（`status === 'completed'`），调用 `POST /plan/summary` 获取结构化数据
- 用一个 `summary` state 存储返回结果，渲染 4 个卡片
- 保持现有 CSS 类名（`plancard` / `kpi-row` / `model` / `tag`）不变

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `docs/api/paths/plan.yaml` | 修改 | 新增 POST /plan/summary |
| `backend/app/schemas/plan_summary.py` | 新增 | PlanSummary 及相关 model |
| `backend/app/services/plan_summary_service.py` | 新增 | checkpoint 读取 + LLM 提炼 |
| `backend/app/prompt_templates/plan_summary.md.j2` | 新增 | LLM 提炼 prompt |
| `backend/app/routers/plan.py` | 修改 | 新增 plan_summary 路由 |
| `frontend/src/api/plan.ts` | 修改 | 新增 getPlanSummary |
| `frontend/src/pages/mobile-workbench/ScreenGenerate.tsx` | 修改 | 完成态调 summary 端点渲染 |

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| LLM 提炼耗时增加方案展示延迟 | 控制在 2s 内；前端先显示"加载中"骨架屏 |
| checkpoint 中缺少某个 agent 输出 | LLM 用已有数据尽力填充，缺失字段为空 |
| LLM 提炼后的数据与原始不一致 | prompt 强调"基于已有数据提炼，不编造" |
