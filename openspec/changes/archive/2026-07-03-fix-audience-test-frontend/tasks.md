## 1. API 层适配

- [x] 1.1 重写 `frontend/src/api/audience.ts`：端点改为 `POST /audience-insight/stream`，请求体改为 `{ product_name }`，SSE 解析改为 `progress` / `result` / `error` 事件
- [x] 1.2 更新 `frontend/src/types/audience.ts`：类型定义适配新事件格式（ProgressEvent、ResultEvent、AudienceInsightResponse）

## 2. 页面组件重写

- [x] 2.1 重写 `frontend/src/pages/AudienceTestPage.tsx`：三列并行卡片替换为四步串行进度条（搜索 → 读页 → 提取 → 画像），每步显示状态和日志消息
- [x] 2.2 底部用户画像展示区适配 `AudienceInsightResponse` 格式（含 audience_data + persona 两部分）
- [x] 2.3 保留 loading/error/empty 状态处理逻辑
