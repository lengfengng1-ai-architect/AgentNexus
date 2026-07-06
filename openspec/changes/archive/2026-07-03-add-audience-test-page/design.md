## Context

对话和意图测试页面已存在（ChatPreviewPage），通过 tab 切换。人群洞察 pipeline（audience_insight_pipeline）后端已注册，包含三个并行 Agent（product_research、market_analysis、audience_search）和最终的 generate_persona。目前缺少前端可视化测试入口。

## Goals / Non-Goals

**Goals:**
- 在 ChatPreviewPage 新增第三个 tab "用户画像测试"
- 三列卡片展示三个 Agent 并行执行的状态和思维链日志
- 底部展示最终的用户画像输出
- 复用已有的 SSE 工作流端点，不改后端

**Non-Goals:**
- 不改后端代码（端点、agent、workflow 定义均不动）
- 不做后端 mock 数据的编辑或管理
- 不接入真实 API（沿用现有 mock 机制）

## Decisions

### 1. SSE 流式复用 vs 新建端点
选择**复用现有端点** `POST /workflows/audience_insight_pipeline/run?stream=true`。该端点是通用工作流 runner，已支持所有 workflow。避免新增后端端点即避免 OpenAPI spec 变更。

### 2. 三列布局方案
用 CSS Grid 三列卡片，每列标题带 Agent 图标。状态变化通过 SSE 的 `nodeId` 分发到对应列。逻辑：
- `product_research` → 列1
- `market_analysis` → 列2  
- `audience_search` → 列3
- `generate_persona` → 结果区域（非卡片）

### 3. 思维链展示
每列卡片下方可展开区域，在收到 `node.log` 事件时追加日志行。使用 `useReducer` 管理状态，与 `useWorkflowSSE` 的 reducer 模式一致但简化，按 nodeId 分组存储 log 记录。

### 4. 数据流
```
用户输入 product_name
  ↓
fetch → POST /workflows/audience_insight_pipeline/run?stream=true
         body: { input: { product_name, category: "" } }
  ↓
SSE stream 解析
  ├─ workflow.start → 重置状态
  ├─ node.start (product_research) → 列1 状态改为 "执行中"
  ├─ node.log (product_research, "正在搜索...") → 列1 追加日志
  ├─ node.complete (product_research) → 列1 状态改为 "完成"
  ├─ 同上 market_analysis, audience_search
  ├─ node.start (generate_persona) → 底部区域显示 "生成画像中..."
  ├─ node.complete (generate_persona, data={...}) → 渲染 UserPersona
  └─ workflow.complete → 结束
```

### 5. 状态管理
简单 `useReducer` + `useRef(abortController)`。因为页面生命周期短（测试页，非持续工作台），不需要 `useWorkflowSSE` 那样的完整持久化/重连逻辑。

## Risks / Trade-offs

- [三次网络搜索] → 三个 Agent 都做 DuckDuckGo 搜索+读页，总耗时可能较长（~30-60s）。前端需展示明确的 loading 状态和 "等待中" 指示。
- [无 mock 模式] → 现有 intent_test 使用非流式同步 API。如果后端 mock 模式下 audience_insight_pipeline 也返回 mock，需确认 workflow 定义已支持 mock。当前 product_research 和 market_analysis 在 settings.use_mock_data 时有 mock 路径，audience_search 无 mock 路径 —— 这点是后端已有问题，不在本 change 范围内。
