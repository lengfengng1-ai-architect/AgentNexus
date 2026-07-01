## 1. Schema 定义

- [x] 1.1 创建 `backend/app/schemas/product_info.py` — 定义 ProductInfo、BasicInfo、SourceInfo 等 Pydantic model
- [x] 1.2 创建产品调研请求/响应的 schema（ProductInfoRequest / ProductInfoResponse）

## 2. Prompt 模板

- [x] 2.1 创建 `backend/app/prompt_templates/product_research.md.j2` — 信息提取 prompt
- [x] 2.2 创建 `backend/app/prompt_templates/product_search.md.j2` — 页面筛选 prompt

## 3. Agent 实现

- [x] 3.1 创建 `backend/app/agents/product_research_agent.py` — LangGraph Agent（search→fetch→extract→save 四步）
- [x] 3.2 实现 search_node：调用 WebSearch 搜索产品并筛选高质量页面
- [x] 3.3 实现 fetch_node：调用 WebFetch 逐个读取页面完整内容
- [x] 3.4 实现 extract_node：LLM with_structured_output 提取结构化 ProductInfo，标注来源 URL

## 4. Service 层

- [x] 4.1 创建 `backend/app/services/product_info_service.py` — 先检查 mock_data 缓存，命中则直接返回，未命中则调用 Agent 调研并保存
- [x] 4.2 实现缓存检查逻辑：根据 product_name 生成文件名，检查 JSON 是否存在

## 5. API 路由

- [x] 5.1 创建 `backend/app/routers/product_info.py` — POST /api/v1/product-info 端点
- [x] 5.2 在 main.py 中注册新路由

## 6. 能力边界更新

- [x] 6.1 更新 `docs/superpowers.yaml` — 添加 product-research 到 in_scope

## 7. 测试

- [x] 7.1 创建 `backend/tests/test_agents/test_product_research_agent.py`
- [x] 7.2 创建 `backend/tests/test_routers/test_product_info.py`

## 8. Mock 数据

- [x] 8.1 创建 `backend/mock_data/product_info/` 目录
- [x] 8.2 手动运行一次调研，保存示例 JSON 结果
