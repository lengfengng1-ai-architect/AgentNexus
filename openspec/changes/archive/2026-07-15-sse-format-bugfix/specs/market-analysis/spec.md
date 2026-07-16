## MODIFIED Requirements

### Requirement: 工具调用状态实时推送

#### Scenario: 正常推送工具调用开始
- **WHEN** market analysis agent 的某个节点开始调用 web_search 工具
- **THEN** SSE 推送 `tool_call_start` 事件，格式为 `event: tool_call_start\ndata: {"tool":"web_search","query":"...","search_id":"..."}\n\n`
- **AND** 前端确保能正确解析该 SSE 帧格式

#### Scenario: 正常推送工具调用结束  
- **WHEN** market analysis agent 的某个节点完成一次 web_search 调用
- **THEN** SSE 推送 `tool_call_end` 事件，格式为 `event: tool_call_end\ndata: {"tool":"web_search","query":"...","search_id":"...","result_count":N}\n\n`

### Requirement: SSE 事件帧向后兼容

所有通过 `make_emit` 输出的事件 SHALL 使用标准 SSE 帧格式，与 `build_sse_frame` 输出格式一致。

#### Scenario: emit 输出符合 SSE 标准
- **WHEN** `make_emit` 被调用
- **THEN** 输出格式为 `event: <event_type>\ndata: <json_data>\n\n`
- **AND** 该格式与前端 `useMarketResearchStream` 解析逻辑兼容
