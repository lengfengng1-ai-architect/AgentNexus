## Why

当前意图识别只支持 generate_plan（全流水线）和 chat（纯聊天）两个主要意图。用户说"分析娃哈哈的竞品"、"帮我做市场调研"时没有对应的独立路径——要么走 10 步方案流水线（过度），要么只做聊天回复（不足）。需要一个独立的 `market_research` 意图，引导用户补齐参数后，仅调用市场分析 Agent，把结果（含进度和最终报告）直接返回给用户。

## What Changes

- 意图识别新增 `market_research` intent：识别用户的市场调研/竞品分析/行业分析需求
- `IntentRecognitionOutput` 新增 `market_name` 字段，独立于 `BrandInput.brand_name`
- `market_research` 需要 `market_name` + `category` 两个字段齐全才能执行，缺字段时反问补齐
- 前端 ScreenChat 新增 `market_research` handler：字段齐全时展示"开始分析"按钮，用户点击后调 `POST /market-analysis/stream`，SSE 流式消费 progress/data/node_end/result 事件
- 中间进度实时展示（"📋 定义市场范围"、"📏 测算市场规模"等），最终替换为 `full_report` markdown
- **不跳转屏**，**不触发方案流水线**

## Capabilities

### New Capabilities
- `market-research-intent`: 意图 `market_research` 的识别、字段反问补齐、前端消费 + SSE 流式进度展示

### Modified Capabilities
- （无 spec 级需求变更，仅实现细节修改）

## Impact

- 后端：`intent.py` 新增 `market_name` 字段 → `IntentRecognitionOutput`；prompt 新增 `market_research` 识别规则
- 前端：`chat.ts` types 新增 `market_name`；`ScreenChat` 新增 `market_research` handler + SSE 消费
- 无需新端点、新依赖
