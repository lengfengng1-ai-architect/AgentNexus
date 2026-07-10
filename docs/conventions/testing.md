# 测试规范

## 框架

| 场景 | 框架 | 说明 |
|------|------|------|
| 单元测试 | `pytest` + `pytest-asyncio` | |
| HTTP 测试 | `httpx.AsyncClient` | FastAPI TestClient 底层 |
| mock | `unittest.mock` / `pytest-mock` | |
| 覆盖率 | `pytest-cov` | 阈值 **80%** |
| 数据校验 | Pydantic 自校验 | schemas 本身就是校验器 |

依赖由 uv 管理，声明在 `[dependency-groups] dev` 中（`tool.uv.default-groups = ["dev"]` 自动安装）：

```
pytest>=8  pytest-asyncio  pytest-cov  httpx  pytest-mock
```

## 范围

- **测试重点是单 Agent**——每个 agent 独立测试
- **不测试 Pipeline/工作流编排**，除非用户明确要求（测试代价高且收益低）
- 覆盖率阈值 ≥80%

## 目录结构

tests 镜像 `backend/app`：

```
tests/
├── conftest.py
├── test_agents/           # 单 Agent 测试
├── test_routers/          # API 端点测试
├── test_services/         # Service 层测试
└── test_plan_generation/  # 流水线测试
```

## 编写规范

### AAA 模式

每个测试必须遵循 Arrange-Act-Assert：

```python
async def test_data_query__by_city__returns_filtered_results():
    # Arrange
    city_name = "上海"

    # Act
    result = await data_service.query(city=city_name)

    # Assert
    assert all(item.city == city_name for item in result)
```

### 命名

```
test_{function}__{scenario}__{outcome}
```

示例：

```python
async def test_brand_create__valid_input__returns_brand_with_id(): ...
async def test_fitness_calculate__unknown_sport__returns_zero_score(): ...
```

### 每个端点必须覆盖

| 状态码 | 场景 | 要求 |
|--------|------|------|
| 200/201 | 正常输入 | **强制** |
| 400 | 缺必填字段/格式错误 | **强制** |
| 422 | 类型错误/枚举越界 | **强制** |
| 500 | 内部错误/下游异常 | 推荐 |

### Service 层测试要点

- 每种 mock 数据读取路径覆盖一次
- 边界条件（空列表、越界数值、空字符串）
- 异常传递（mock 数据缺失时抛自定义异常，而非原始 KeyError）

## conftest 约定

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

## Mock 策略

测试真实 agent 时不要做 mock。agent 本身的逻辑（字段提取、条件分支、错误处理）必须被真实覆盖。

Mock 只应在为独立 Mock Agent（`mock_*.py`）编写测试时使用。

## 智能测试选择

全量测试（125+ cases）耗时较长。改代码后只跑受影响的测试：

| 改动范围 | 建议命令 |
|----------|---------|
| Agent 内部（prompt/node/graph） | `uv run pytest -x -q tests/test_agents/test_<name>_agent.py` |
| Service 层 | 对应 service + 依赖该 service 的 router 测试 |
| Router 层 | 全量 router 测试 + 依赖的 service |
| 通用模块（utils/config/schemas） | 所有引用该模块的测试 |
| 不确定影响范围 | 用 LLM 评估波及模块后精确选定 |

## 运行命令

```bash
# 先激活 venv（重要，跳过 uv 的环境检测开销）
source .venv/bin/activate

# 全量运行
uv run pytest -v --cov=app --cov-report=term-missing

# 单文件/关键字筛选
uv run pytest -v tests/test_routers/test_brands.py
uv run pytest -v -k "fitness"

# 跳过 uv run 进程开销，直接调用 venv 内的 pytest（快 2-5 倍）
.venv/bin/pytest -x -q tests/test_agents/test_<name>.py
```
