# 测试规范

## 框架选型

| 场景 | 框架 | 说明 |
|------|------|------|
| 单元测试 | `pytest` + `pytest-asyncio` | 通过 `uv run pytest` 执行 |
| HTTP 测试 | `httpx.AsyncClient` | FastAPI TestClient 底层 |
| mock | `unittest.mock` / `pytest-mock` | 标准 mock 库即可 |
| 覆盖率 | `pytest-cov` | 阈值：**80%** |
| 数据校验 | Pydantic 自校验 | schemas 本身就是校验器 |

依赖由 uv 管理。dev 依赖声明在 `[dependency-groups] dev` 中：

```
pytest>=8
pytest-asyncio
pytest-cov
httpx
pytest-mock
```

uv 会自动安装 `[dependency-groups] dev` 中的包（`tool.uv.default-groups = ["dev"]`）。

## 测试范围

- **测试重点是单 Agent**——每个 agent 独立测试。
- **不测试 Pipeline/工作流编排**，除非用户明确要求。pipeline 属于编排层的内部实现细节，测试代价高且收益低。
- 覆盖率阈值 ≥80%。

## Mock 策略

mock 是可选的，不是必须的：
- **可以 mock**——mock 掉 LLM/网络层，跑通逻辑路径。适合 CI 环境。
- **也可以调真实 LLM**——本地开发时直接调真实 API，覆盖真实输出。前提是 `.env` 配好 key。

关键不在于 mock 与否，而在于**测试必须验证 agent 的行为逻辑**（字段提取、条件分支、错误处理），不只是 mock 个空返回值。

tests 目录结构镜像 `backend/app`：

```
tests/
├── conftest.py              # 全局 fixture
├── test_routers/
│   ├── __init__.py
│   ├── test_brands.py       # 对应 routers/brands.py
│   ├── test_data.py
│   ├── test_fitness.py
│   ├── test_plans.py
│   └── test_export.py
└── test_services/
    ├── __init__.py
    ├── test_brand_service.py
    ├── test_data_service.py
    ├── test_fitness_service.py
    ├── test_plan_generator.py
    └── test_export_service.py
```

## conftest.py 约定

必须提供的 fixture：

```python
@pytest.fixture
async def client() -> AsyncGenerator:
    """测试用 HTTP client，自动加载 mock 数据"""
    ...

@pytest.fixture
def mock_data_dir() -> Path:
    """指向 backend/mock_data/ 的路径"""
    ...
```

禁止在 conftest 中加载生产环境配置或真实外部连接。

## 测试命名

```
test_{function_name}__{scenario}__{expected_outcome}
```

示例：

```python
async def test_brand_create__valid_input__returns_brand_with_id():
    ...

async def test_fitness_calculate__unknown_sport__returns_zero_score():
    ...
```

使用下划线分段的目的是在 pytest -v 输出或 CI log 中一眼可读。

## 测试内容要求

### 每个端点必须覆盖

| 状态码 | 场景 | 必须？ |
|--------|------|--------|
| 200/201 | 正常输入 | **强制** |
| 400 | 缺必填字段/格式错误 | **强制** |
| 422 | 类型错误/枚举越界 | **强制** |
| 500 | 内部错误/下游异常 | 推荐 |

### services 层测试要点

- 每种 mock 数据读取路径覆盖一次
- 边界条件（空列表、越界数值、空字符串）
- 异常传递（mock 数据缺失时抛自定义异常，而非原始 KeyError）

## 测试 AAA 模式

p>每个测试必须遵循 Arrange-Act-Assert：

```python
async def test_data_query__by_city__returns_filtered_results():
    # Arrange
    city_name = "上海"

    # Act
    result = await data_service.query(city=city_name)

    # Assert
    assert all(item.city == city_name for item in result)
```

## Mock 数据规范

- 全局 mock 数据由 conftest 的 fixture 一次性加载
- 不逐个端点写局部 mock fixture（除非那个端点用的数据和其他不一致）
- 切换真实 API 时只改 service 实现类，不修改测试的 fixture 结构

## 运行命令

```bash
# 全量运行
cd backend && uv run pytest -v --cov=app --cov-report=term-missing

# 单文件
uv run pytest -v tests/test_routers/test_brands.py

# 按关键字
uv run pytest -v -k "fitness"
```
