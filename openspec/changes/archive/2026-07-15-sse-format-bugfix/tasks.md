## 1. 修复 SSE 帧格式

- [x] 1.1 修改 `backend/app/agents/tools/event_stream.py`：`make_emit` 中将 `encoder.encode({"event": ..., "data": ...})` 替换为 `build_sse_frame(event, data)`，删除不再使用的 `encoder` 变量

## 2. 验证

- [x] 2.1 语法检查：Python `ast.parse` 验证文件无语法错误
- [ ] 2.2 重启后端服务，发起市场分析请求，确认 PC 端显示搜索来源卡片滚动和状态条
- [ ] 2.3 移动端确认相同效果
