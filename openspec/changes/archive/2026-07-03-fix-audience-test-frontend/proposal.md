## Why

前端用户画像测试页（AudienceTestPage）对接的后端端点已不存在。后端已删除 workflow 引擎，改为直接用 LangGraph 节点实现 `POST /audience-insight/stream`，事件格式从 `node.start/node.log/node.complete` 变为 `progress/result`。前端必须适配新的 API 和事件协议。

superpowers in_scope ID: `audience-insight`

## What Changes

- 重写 `frontend/src/api/audience.ts`：端点改为 `/audience-insight/stream`，请求体改为 `{ product_name }`，解析 `progress` / `result` / `error` 事件
- 重写 `frontend/src/pages/AudienceTestPage.tsx`：三列并行卡片改为纵向 4 步进度条 + 日志流 + 底部画像展示（适配后端串行执行的实际行为）
- 更新 `frontend/src/types/audience.ts`：类型定义适配新事件格式

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `audience-test`：前端测试页的 SSE 协议和可视化布局从"三 Agent 并行"改为"单 Agent 四步串行进度展示"

## Impact

- 仅影响前端 3 个文件，不改后端
- 不影响 ChatPreviewPage 的 tab 结构（已有的第三个 tab 保持不变）
- mock 数据无变化
