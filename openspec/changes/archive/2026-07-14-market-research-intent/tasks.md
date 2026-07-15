## 1. 后端 — intent_recognition 新增 market_research 意图

- [x] 1.1 `IntentRecognitionOutput.intent` 的 regex pattern 新增 `market_research`
- [x] 1.2 `IntentRecognitionOutput` 新增 `market_name: str | None` 字段，description="市场调研的研究目标（品牌名/赛道名）"
- [x] 1.3 修改 `intent_recognition.md.j2` prompt，在 generate_plan/clarify 之间插入 market_research 识别规则
- [x] 1.4 `_normalize_intent_output` 增加 `market_research` 分支：检查 market_name + category，设 missing_fields + reply 反问话术
- [x] 1.5 `_load_system_prompt` 中 context 支持 `market_name` 字段传递（新增到 clean_ctx）

## 1b. market_research 字段收集——反问补齐缺失参数

- [x] 1b.1 prompt #4 规则新增 market_research 条目：market_name（研究目标）和 category（品类）缺一不可执行
- [x] 1b.2 prompt 规则增加反问模板：缺 market_name / 缺 category / 两者都缺三种情况不同话术
- [x] 1b.3 `stream_intent_recognition` 中 `elif context.get("brand_input")` 分支增加 `market_name` 的上下文填充逻辑

## 2. 前端型扩展 + UI

- [x] 2.1 `ChatMessage` 中新增 `canStartMarketResearch?: boolean`, `marketName?: string`
- [x] 2.2 `chatReducer` `INTENT_RECEIVED` 中设 `canStartMarketResearch = intent==='market_research' && missingFields为空`
- [x] 2.3 `ChatBubble` 新增 `onStartMarketResearch` prop，渲染"开始分析"按钮（仅在 `canStartMarketResearch` 时显示）

## 3. ScreenChat — market_research handler

- [x] 3.1 `ScreenChat` 新增 `handleStartMarketResearch` callback
- [x] 3.2 callback 调 `POST /market-analysis/stream({market_name, category})`，消费 SSE
- [x] 3.3 progress 事件 → 追加"📋 定义市场范围"等进度行到气泡 content
- [x] 3.4 node_end 事件 → 追加"  ✓ 完成"
- [x] 3.5 result 事件 → 将气泡内容替换为 `full_report` markdown
- [x] 3.6 错误处理：网络失败或流出错时展示错误消息
- [x] 3.7 组件卸载时 abort 正在进行的请求

## 4. 测试

- [x] 4.1 intent recognition `market_research` prompt 测试（mock + 3 个新增 case）
- [x] 4.2 `_normalize_intent_output` 的 market_research 字段检查单元测试
- [ ] 4.3 前端 intent handler / SSE 消费单元测试（mock API + SSE stream）

## 5. 更新 OpenAPI YAML

- [x] 5.1 `docs/api/paths/intent.yaml` 中 `x-intent-list` 新增 `market_research`
- [x] 5.2 `intent.yaml` 中 `IntentRecognitionOutput` schema 新增 `market_name` 字段
