## 1. Schema 重写

- [x] 1.1 创建 SourcedStr/SourcedStrList/SourcedDict 基础溯源类型（含 method、quote）
- [x] 1.2 创建 Identity/OfficialDescription/Feature/PriceItem/Availability 模块
- [x] 1.3 创建 ProductResearchResult 顶层结构

## 2. Prompt 模板更新

- [x] 2.1 重写 `product_research.md.j2` — 要求标注 method，official_description 优先 quoted，features 逐条 evidence

## 3. Agent 调整

- [x] 3.1 适配 extract_node 输出新 schema
- [x] 3.2 实现 features 逐条提取并独立标注 evidence 的逻辑
- [x] 3.3 实现 official_description 优先 quoted 的回退逻辑

## 4. Service 层适配

- [x] 4.1 适配 service 层使用新的 ProductResearchResult 类型

## 5. 测试更新

- [x] 5.1 更新 `test_product_research_agent.py`
- [x] 5.2 更新 `test_product_info.py`
