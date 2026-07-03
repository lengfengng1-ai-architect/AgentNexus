# Prompt 模板系统规范

## 存放位置

所有 prompt 模板集中在 `backend/app/prompt_templates/`：

```
backend/app/prompt_templates/
├── intent_recognition.md.j2  # 意图识别
├── chat_extraction.md.j2     # 品牌字段提取
├── market_analysis.md.j2     # 市场分析（7 节点共享）
├── plan_chapters/             # 【已废弃】旧分章节方案
├── product_research.md.j2    # 产品信息调研
├── data_query.md.j2          # 数据查询路由
├── strategy_generation.md.j2 # 营销策略
├── execution_planning.md.j2  # 执行规划
├── budget_kpi.md.j2          # 预算与 KPI
├── action_recommendations.md.j2 # 行动建议
├── plan_generator.md.j2      # 方案生成汇总
├── research_*.md.j2          # 市场研究子节点（7 个）
└── product_search.md.j2      # 搜索结果过滤
```

- 后缀 `.md.j2` 表示这是 Markdown 格式的 Jinja2 模板

### 文件头注释

每个模板文件头部必须包含标准注释块，说明变量来源：

```jinja2
{#
  Variables:
    - message: str — 用户最新输入（来源：chat router）
    - context.brand_input: dict — 已确认品牌字段（来源：chat 上下文）
    - context.conversation_history: list[str] — 对话历史
#}
```

### 业务数据与 Prompt 分离

Prompt 中的**提取规则 / 映射数据**应提取到 `backend/mock_data/` 的 JSON 文件中，通过 Jinja2 变量传入，不要在 prompt 里硬编码：

```
mock_data/
├── intent_rules.json       # 意图提取规则（品牌名/城市/预算/周期提取模式）
└── category_fitness.json   # 品类→运动适配度评分映射
```

模板渲染方负责加载 JSON 并传给模板变量，模板只使用变量但不定义规则细节。

### 变量注入

## 模板格式

### 变量命名

```
# 品牌输入
brand_name          # 品牌名称
brand_category      # 品牌品类
brand_city          # 目标城市
brand_budget        # 预算（万元，整数）
brand_period        # 周期（月）

# 平台数据
city_data           # 该城市平台数据摘要
sport_data          # 该运动品类平台数据
events_list         # 可选活动列表
influencers_list    # 推荐达人

# 适配度
fitness_scores      # 品类×运动适配度评分
fitness_summary     # 文字摘要

# 输出控制
tone                # 文案风格（professional / energetic / luxury）
output_format       # 输出格式（markdown / json）
```

### 变量注入

变量全部通过 Jinja2 渲染注入，禁止字符串拼接替代：

```python
# ✅ 正确：Jinja2 渲染
template = env.get_template("plan_chapters/chapter_01.md.j2")
prompt = template.render(
    brand_name="Nike",
    brand_category="running_shoes",
    city_data=city_summary,
    fitness_scores=scores,
)

# ❌ 错误：字符串拼接
prompt = f"品牌名称：{brand_name}\n运动品类：{sport_type}..."
```

### 全局约束

`system_prompt.md.j2` 中统一声明，各章节模板不重复写：

- 角色定义
- 数据引用规则（禁止编造厂商/达人/赛事名称）
- 输出格式要求
- 章节结构约束

每个章节模板只写该章独有的内容。

## 变量来源映射

每个模板变量必须有明确的 service 层来源：

```
模板变量                    → 来自
brand_name, brand_category → brand_service.get_brand_input()
city_data                  → data_service.query_city_summary()
fitness_scores             → fitness_service.calculate()
events_list                → data_service.query_events()
influencers_list           → data_service.query_influencers()
```

如果变量来源在 schema 或 service 中不存在，必须先在 OpenSpec 中定义。

## 测试

每个模板必须有对应的测试，验证：

1. 模板渲染不报错（变量齐全）
2. 渲染结果中不出现 `{{` `}}` 残渣
3. 渲染结果不含空白数据占位符（如 `""`、`null` 字符串）

```python
async def test_chapter_01_renders_without_error():
    template = load_template("plan_chapters/chapter_01.md.j2")
    result = template.render(brand={"name": "Test"}, ...)
    assert "{{" not in result
    assert "}}" not in result
```
