## Context

移动端工作台 ② 简报屏（ScreenBrief）和 ③ 方案生成屏（ScreenGenerate）目前是纯静态 mockup，无后端数据驱动。PC 端已有完整的 agent 工作流（LangGraph StateGraph + SSE 流式 + 10-Agent Pipeline + checkpoint 暂停），技术方案成熟。

本次设计将移动端这两屏与现有后端接通，同时新增一个轻量 AI 辅助端点用于核心策略优化。

## Goals / Non-Goals

**Goals:**
- ScreenBrief 表单字段绑定 state，提交时构造扩展版 brand_input 调用 POST /plan/run
- 新增 `POST /plan/strategy-optimize` 端点，接收表单数据返回 LLM 生成的核心策略
- ScreenGenerate 通过 `useMobilePlanRun` hook 消费 SSE 流，展示实时流水线进度和最终方案内容
- 移动端支持 checkpoint 暂停展示（优雅模态对话框），用户可确认继续或驳回重跑
- 方案生成完成后底部 CTA 跳转到 ④ 行动建议屏

**Non-Goals:**
- 不修改 PC 端 usePlanRun 和 PlanPage 的行为
- 不修改后端 pipeline 的 10 个 Agent 内部逻辑（仅扩展 brand_input 传递）
- 移动端对话屏（① 对话入口）暂不接入后端真正聊天接口

## Decisions

### D1: 新增单独策略优化端点 vs 复用对话屏接口

**选择**：新增 `POST /plan/strategy-optimize` 端点

理由：
- 策略优化是单向的"给你表单数据 → 你返回文案"，不需要对话上下文
- 对话屏接口需要维护 messages 状态，复杂度更高
- 独立端点响应速度更快（不用走完整 pipeline），返回后直接填充 textarea
- 后续可复用做其他字段的 AI 辅助填写

### D2: useMobilePlanRun 与 PC 端 usePlanRun 的关系

**选择**：新建 `useMobilePlanRun` hook，独立实现

理由：
- PC 端 usePlanRun 包含 checkpoint 暂停的审批/驳回/重跑完整逻辑（~650 行）
- 移动端需要更轻量的 hook，通过 `branch` 配置支持简化或完整模式
- 两边的状态展示 UI 差异大（移动端是流水线步骤卡片 vs PC 端是侧边栏 + tab 节点）
- 但共享核心的 SSE 解析逻辑（`readSSEStream`、`parseSSELine`），移动到 shared utils 复用

### D3: brand_input 扩展方式

**选择**：后端 `plan_generation_service.py` 的 `start_run` 函数接收的 `brand_input` 字典不做强校验，额外字段直接透传到 state

理由：
- `start_run` 内部已经使用 `state = {"brand_input": brand_input}` 初始化
- 现有多数 Agent 从 `state["brand_input"]` 中读取所需字段（品牌名、品类等）
- 新增字段在不需要传递的场景下自动被忽略（向下游传递时才取出）
- 避免 breaking change，PC 端不受影响

### D4: 移动端 checkpoint 交互方式

**选择**：当 SSE 收到 `workflow.paused` 事件时，ScreenGenerate 底部上滑弹出一个全屏/半屏模态面板

理由：
- 用户要求"界面设计要好点"，全屏面板比 PC 端简陋的黄色提示框更适合移动端
- 面板内显示当前暂停节点名称、上游已完成节点摘要、确认继续 / 驳回重跑按钮
- 驳回时弹出底部 action sheet 输入原因

### D5: 扩展 brand_input 的 OpenAPI YAML 方式

**选择**：在 `docs/api/paths/plan.yaml` 的 `PlanRunRequest` schema 中增加 `brand_input` 的扩展字段定义（optional 字段），通过 `additionalProperties` 透传

理由：
- 后端不强制校验额外字段，但 API 文档需要完整描述
- 下游 Agent 按需读取字段，解耦

## 数据流

```
ScreenBrief                             ScreenGenerate
┌──────────────────┐                    ┌──────────────────────┐
│ 表单 (controlled) │──brand_input──▶    │  useMobilePlanRun    │
│                  │  POST /plan/run    │  (SSE consumer)      │
│ [AI优化策略]      │                    │                      │
│                  │◀──策略文案────────   │  步骤 ① ✓           │
│ POST /strategy-  │                    │  步骤 ② ◉           │
│ optimize ◀──────▶│  POST /plan/run    │  步骤 ③ pending      │
│                  │  SSE 流             │  ...                 │
│                  │                    │  workflow.paused →   │
│ [AI生成方案]──────▶  start_run()       │  模态审核对话框       │
└──────────────────┘                    │  approve/reject      │
                                        │  workflow.complete → │
                                        │  方案内容渲染          │
                                        │  底部CTA → ④         │
                                        └──────────────────────┘
```

## API 设计

### 新增端点: POST /plan/strategy-optimize

```
Request:
{
  "brand_name": "娃哈哈",
  "category": "果汁饮料",
  "product_matrix": "魅力系列（蓝莓/石榴/荔枝）",
  "target_audience": "25-35岁 一线白领",
  "marketing_goal": "认知度 ≥60% · 私域会员 ≥50万"
}

Response 200:
{
  "success": true,
  "data": {
    "strategy": "以「运动盟域」为载体，4M+1C 集群营销模型..."
  }
}

Response 422:
{
  "detail": "..."
}
```

### 修改端点: POST /plan/run

brand_input 扩展字段（均为 optional）：

```json
{
  "brand_name": "娃哈哈",
  "category": "果汁饮料",
  "city": "上海",
  "budget": 400,
  "period": 3,
  "product_matrix": "魅力系列（蓝莓/石榴/荔枝）",
  "target_audience": "25-35岁 一线白领",
  "marketing_goal": "认知度 ≥60% · 私域会员 ≥50万",
  "core_strategy": "以运动盟域为载体构建产品-场景-人群三位一体闭环",
  "selected_cities": ["北京", "上海", "广州", "深圳"]
}
```

## 前端组件改造

### ScreenBrief 改造点
- 表单从 `defaultValue` 改为 `useState` controlled
- 核心策略字段右侧添加 AI 图标按钮
- 点击 AI 图标 → 调后端 strategy-optimize → 填充结果到 textarea
- "AI 生成方案"按钮 → 构造 brand_input → navigate 到 generate 屏 → 触发 useMobilePlanRun.start()

### ScreenGenerate 改造点
- 保持现有的竖向流水线样式（圆形 dot + 竖线连接 + 节点名称 + **描述短句** + 状态标签），从 5 步改为动态读取 10 个 Agent 节点
- 每个 Agent 节点标题下方显示一行**描述短句**（即 PC 端 PipelineTimeline 中 `agent.desc` 字段，如"搜索并分析品牌产品信息与市场定位"），样式同现有 mock 的 `.sd` 类（11px, `--muted` 色，`margin-top: 2px`）
- 描述短句在节点**空闲/待执行**时显示静态文案；在 **running** 时替换为最新一条操作日志摘要；**完成**后固定为总结性描述
- 节点状态驱动：pending（灰色空心圆 + "待执行"）/ running（蓝色脉冲 + "执行中…"）/ completed（蓝色实心✓ + "已完成"）/ failed（红色✗ + "失败"）/ paused（黄色⏸ + "等待确认"）
- **日志交互**：点击任一 Agent 节点 → 该节点下方自然向下滑动展开操作日志卡片。日志卡片使用 `--surface`（`#f7f8fa`）轻灰底色 + `--border` 描边，圆角 `--r-md`，每行日志使用 emoji 前缀，字体 11px sans-serif（不引入深色终端风格）
  - **当前正在执行**的 Agent 自动展开日志
  - **已完成 / 待执行**的 Agent 默认收起，用户可手动点击查看历史日志
  - 再次点击同一节点 → 日志卡片向上滑回收起
  - 节点之间的竖线自动跟随变化：展开日志时父元素 `.step` 高度增大 → `::before`（竖线）的 `top`/`bottom` 百分比定位自然拉长；收起时自然缩短。不需要额外过渡动画，CSS 的 absolute 定位天然跟随父元素高度变化
- 点击日志卡片中的某一行的"详情"可展开该条日志的详细信息
- 方案完成前底部无 CTA；完成后出现蓝色渐变 `cta-line`「下一步行动建议」，点击跳转到 ④ 屏
- 收到 `workflow.paused` 事件时 → 底部上滑弹出审核模态面板

### useMobilePlanRun hook
- 内部 state: `status`, `steps` (10 个节点状态), `outputs`, `chapters`, `pausedSnapshot`, `error`
- 暴露方法: `start(brandInput)`, `approve()`, `reject(reason)`
- SSE 解析复用 PC 端的 `readSSEStream` / `parseSSELine` 逻辑

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `docs/api/paths/plan.yaml` | 修改 | brand_input 扩展字段定义；新增 strategy-optimize 端点 |
| `backend/app/routers/plan.py` | 修改 | 新增 strategy_optimize 路由 |
| `backend/app/services/plan_generation_service.py` | 修改 | start_run 接收额外字段 |
| `backend/app/schemas/plan_run.py` | 修改 | 新增 StrategyOptimizeRequest schema |
| `backend/app/prompt_templates/strategy_optimize.md.j2` | 新增 | 策略优化 prompt 模板 |
| `frontend/src/pages/mobile-workbench/ScreenBrief.tsx` | 修改 | controlled 表单 + AI 优化 + 提交逻辑 |
| `frontend/src/pages/mobile-workbench/ScreenGenerate.tsx` | 修改 | SSE 驱动动态组件 |
| `frontend/src/hooks/useMobilePlanRun.ts` | 新增 | 移动端轻量流水线 hook |
| `frontend/src/types/plan.ts` | 无变动 | 复用现有类型 |
| `openspec/specs/mobile-workbench-preview/spec.md` | 修改 | ② ③ 屏 spec 更新 |

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| 移动端 SSE 连接断线 | useMobilePlanRun 实现 reconnect 逻辑，刷新页面后走 restoreFromRunId |
| 策略优化 LLM 返回慢 | 控制在 3-5 秒内，超时后前端显示"AI 服务暂时繁忙" |
| ScreenBrief->Generate 跳转时数据传递丢失 | 使用 hook 内部 state 传递（非路由参数），或 sessionStorage 兜底 |
| checkpoint 暂停在移动端打断用户流程 | 使用全屏模态面板，明确显示暂停原因和可选操作，而非 PC 端的小黄框 |
