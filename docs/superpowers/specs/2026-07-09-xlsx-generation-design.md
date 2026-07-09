# XLSX 表格生成 — Design Doc

## 背景

方案生成流水线中，目前只输出 9 章 Markdown 方案文档。缺少结构化的预算/KPI/时间线表格输出，不便于品牌方快速查看关键数据和对比方案。

## 目标

给方案生成 agent（`plan_generator_agent`）增加并行 XLSX 表格生成能力：
- 基于上游节点结构化数据，与 9 章方案内容**并行生成**
- 通过 LangChain `@tool` 格式实现，供任意 agent 复用
- 输出格式参考 `娃哈哈营销方案_预算流程回报分析.xlsx` 的 4 个工作表结构

## 架构

```
上游节点数据（budget_kpi / execution_planning / strategy_generation / ...）
                    │
          ┌─────────┴──────────┐
          │    asyncio.gather   │
          │          并行        │
          ├─────────────────────┤
          │                     │
    plan_generator        with_structured_output(XlsxData)
   (1-shot 9 章)               │
          │               generate_plan_xlsx @tool
          │                     │
          └─────────┬───────────┘
                    │
          plan_generator 输出
       { chapters, xlsx_path }
```

## 文件清单

### 1. `backend/app/schemas/xlsx_generation.py` — 结构化数据模型

LLM 用 `with_structured_output` 输出此模型，tool 直接消费。

- `BudgetOverviewSheet` — 预算总览对比表行
- `BudgetOverviewSheet` — 完整工作表（表头 + 行 + 合计 + 备注）
- `BudgetDetailItem` — 预算明细条目（大类/子项/用途/金额/备注）
- `BudgetDetailSheet` — 预算明细表 + 分类汇总
- `TimelineItem` — 时间线条目（阶段/时间/目标/任务/动作/负责方/产出）
- `TimelineSummary` — 阶段汇总（阶段/起始周/持续周数）
- `KPIDimension` — KPI 条目（维度/指标名称/定义/目标值/达成路径/数值）
- `ROIAnalysis` — ROI 投入产出分析
- `EfficiencyMetrics` — 效率指标
- `ScoreCard` — 方案综合评分
- `XlsxData` — 全部工作表的聚合模型

### 2. `backend/app/agents/tools/generate_xlsx.py` — LangChain @tool

```python
@tool(args_schema=GeneratePlanXlsxInput)
async def generate_plan_xlsx(data: XlsxData, brand_name: str) -> str:
    """根据方案结构化数据生成 XLSX 预算流程回报分析表格。"""
```

- 用 openpyxl 组装 4 个工作表
- 文件名：`{品牌}_{品类}_{date}_预算流程回报分析.xlsx`
- 输出目录：`backend/generated_xlsx/`

**版本对比逻辑：**
- 单城市：只生成一个版本，无对比
- 多城市：自动生成汇总版 + 各城市版对比

### 3. `backend/app/agents/plan_generator_agent.py` — 修改

在现有 1-shot 9 章生成后，增加并行分支：

```python
async def run_plan_generator(state, writer=None):
    # 已有：1-shot LLM 调用
    # 新增：并行的结构化输出 + xlsx 生成
    llm = build_chat_model().with_structured_output(XlsxData)
    xlsx_data_task = llm.ainvoke([...])  # 基于上游节点数据

    gather_results = await asyncio.gather(
        _generate_chapters(...),   # 1-shot 9章
        xlsx_data_task,            # 结构化数据
    )
    chapters, xlsx_data = gather_results
    xlsx_path = await generate_plan_xlsx.ainvoke(xlsx_data)
    return PlanGeneratorOutput(chapters=chapters, xlsx_path=xlsx_path).model_dump()
```

### 4. `backend/pyproject.toml` — 已有 `openpyxl` 依赖

已添加，无需改动。

## 数据映射

上游节点 → XLSX 工作表：

| 上游节点 | XLSX 工作表 |
|---------|------------|
| `budget_kpi.allocations` | 预算总览对比、预算明细 |
| `execution_planning` | 活动流程时间线 |
| `budget_kpi.kpis` | 预期效果KPI |
| `strategy_generation` | 方案综合评分 |
| `brand_input` | 表头信息（品牌名、版本、周期） |

## 输出

`plan_generator` 节点的输出扩展到包含 `xlsx_path`：

```python
class PlanGeneratorOutput(BaseModel):
    chapters: list[PlanChapter]
    xlsx_path: str = ""  # 新加，生成的 xlsx 文件路径
```

## 边界情况

- **单城市**：预算总览表只显示单列，无对比
- **多城市**：自动生成汇总+各城市对比
- **LLM 结构化输出失败**：捕获异常，xlsx_path 返回空，不影响方案生成
- **openpyxl 写入失败**：捕获异常，xlsx_path 返回空
