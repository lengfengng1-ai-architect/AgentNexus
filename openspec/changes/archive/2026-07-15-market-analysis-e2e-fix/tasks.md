## 1. 后端来源提取

- [x] 1.1 `assemble_result()` 加 `_extract_sources()` 从节点文本字段正则提取来源 URL，填充 `evidence[]`

## 2. 前端双重提取

- [x] 2.1 `ScreenChat` data 事件处理加正则从 `nodeResult` 文本字段提取来源 URL
- [x] 2.2 `ChatContainer` data 事件处理加正则从 `nodeResult` 文本字段提取来源 URL

## 3. 完整报告渲染

- [x] 3.1 `MarketResearchResultCards` 完整报告区用 `marked.parse()` 渲染

## 4. Mock 数据

- [x] 4.1 新建 `mock_data/market_analysis/职场情绪价值消费.json` 带 evidence 的结构化数据（Pydantic schema 验证通过）

## 5. 验证

- [x] 5.1 类型检查通过
- [x] 5.2 测试通过
