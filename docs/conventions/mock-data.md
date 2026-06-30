# Mock 数据规范

> MVP 阶段所有数据查询走本地 mock JSON 文件。本文件定义 mock 数据的组织方式和质量要求。

## 存放位置

所有 mock 数据文件位于 `backend/mock_data/`，扁平方放置，不嵌套目录。

```
backend/mock_data/
├── cities.json              # 城市列表
├── sports.json              # 运动品类列表
├── leagues.json             # 赛事/联盟数据
├── events.json              # 活动数据
├── influencers.json         # 达人列表
├── clubs.json               # 经营社/俱乐部
├── brand_input_sample.json  # 品牌需求样例
└── __init__.py              # （可选）统一加载入口
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

service 层通过一个 `MockDataLoader`（放在 `app/services/data_service.py`）加载 mock 数据：

```python
# 伪代码约定
class MockDataLoader:
    def load_cities(self) -> list[City]: ...
    def load_events(self, city: str | None = None) -> list[Event]: ...
```

**切换真实 API 时**，将 `MockDataLoader` 的实现在不影响调用方的前提下替换为 HTTP client。调用方只依赖返回的 Pydantic model 类型，不依赖数据来源。

## 审批

- Mock 数据的命名字段变更需要团队另一成员复核（防止编造数据混入）
- 数值字段的调整不需要审批，但需在 PR 中注明
