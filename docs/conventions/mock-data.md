# Mock 数据规范

> MVP 阶段所有数据查询走本地 mock JSON 文件。本文件定义 mock 数据的组织方式和质量要求。

## 存放位置

所有 mock 数据文件位于 `backend/mock_data/`，按功能模块组织子目录：

```
backend/mock_data/
├── product_info/           # 产品信息调研缓存（按产品名命名的 JSON）
├── market_analysis/        # 市场分析结果缓存（按 market_name 命名的 JSON）
├── audience_insight/       # 人群洞察缓存（按 product_name 命名的 JSON）
├── user_persona/           # 用户画像缓存（按 product_name 命名的 JSON）
├── category_fitness.json   # 品类×运动适配度评分映射
├── intent_rules.json       # 意图提取规则配置
├── allygo_city_data.json   # AllyGo 平台城市数据
├── plan_*.json             # 方案生成 pipeline 各节点 mock 输出（9 个）
├── market.json             # 市场分析 mock 响应
├── brand_dimension_map.json # 品牌数据维度映射
├── influencers.json        # 达人列表
├── leagues.json            # 赛事/联盟数据
└── stores.json             # 门店数据
```

## JSON 格式约定

### 根结构

每个文件必须是包含 `data` 和 `meta` 的对象：

```json
{
  "data": [ ... ],
  "meta": {
    "total": 12,
    "last_updated": "2026-06-01",
    "source": "manual",
    "version": "v0.1"
  }
}
```

- `data` — 数组，每条记录是一个完整对象
- `meta.total` — 必须等于 `data.length`
- `meta.source` — `"manual"`（人工构造）、`"synthetic"`（代码生成）、`"api_snapshot"`（真实 API 快照）
- `meta.last_updated` — ISO 日期

### 记录结构

字段名必须用 snake_case，必须与 OpenSpec 中对应 schema 的字段名一致：

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "示例赛事",
  "sport_type": "running",
  "city": "上海",
  "participant_count": 5000
}
```

## 数据质量要求

### 命名字段（强制）

- **所有名称必须使用真实数据**（真实城市名、真实运动品类、真实赛事名称）
- MVP 阶段可手动录入一个城市（如上海）的核心数据，不要求全量
- **LLM 不可编造 mock 中不存在的名称**

### 数值字段

- 数值可以合理虚构，但必须保持内部一致性
  - 例如：participant_count 不应超过该城市该运动的目标人群规模
  - 价格/成本数值必须落在合理市场区间
- 建议从公开可查的数据范围取中间值

### 关联一致性

跨文件的 ID 必须可关联：

```
cities.json → id="shanghai"
events.json → records 中 city_id="shanghai"  # 必须存在
leagues.json → records 中 city_id="shanghai" # 可选
```

不一致的 ID 会导致 service 层关联查询静默返回空，调试困难。

## 与 service 层的接口

数据提供者抽象在 `app/services/data_provider.py` 中，通过 `get_data_provider()` 获取。切换真实 API 时替换内部实现即可：

```python
from app.services.data_provider import get_data_provider

provider = get_data_provider()
city_data = provider.get_city_data("上海")
```

## 审批

- Mock 数据的命名字段变更需要团队另一成员复核（防止编造数据混入）
- 数值字段的调整不需要审批，但需在 PR 中注明
