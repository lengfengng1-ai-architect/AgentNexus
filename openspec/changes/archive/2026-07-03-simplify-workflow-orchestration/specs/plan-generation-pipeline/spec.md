# 方案生成流水线

## Purpose

定义营销方案生成的执行流程。通过 LangGraph StateGraph 依次调 10 个 agent，串行执行。

## Requirements

### R1: 执行流程

方案生成按以下顺序执行：

1. product_research — 产品信息调研
2. market_research — 市场分析
3. audience_insight — 人群洞察
4. plan_data_query — 平台数据查询
5. fitness_analysis — 适配度分析
6. strategy_generation — 策略制定
7. execution_planning — 执行规划
8. budget_kpi — 预算 KPI
9. action_recommendations — 行动建议
10. plan_generator — 方案汇总

### R2: 流式输出

支持 SSE 流式返回，每完成一个节点推送 node.complete 事件。

### R3: 错误处理

任一节点失败则终止整个 pipeline。
