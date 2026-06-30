# Prompt 模板系统规范

## 存放位置

所有 prompt 模板集中在 `backend/app/prompt_templates/`：

```
backend/app/prompt_templates/
├── system_prompt.md.j2       # 方案生成系统 prompt（角色设定+全局约束）
├── plan_chapters/             # 各章节 prompt
│   ├── chapter_01.md.j2      # 方案概述
│   ├── chapter_02.md.j2      # 品牌分析
│   ├── chapter_03.md.j2      # 运动场景匹配
│   ├── chapter_04.md.j2      # 赛事体系
│   ├── chapter_05.md.j2      # 达人矩阵
│   ├── chapter_06.md.j2      # 活动规划
│   ├── chapter_07.md.j2      # 媒介策略
│   ├── chapter_08.md.j2      # 预算分配
│   └── chapter_09.md.j2      # 执行时间线
└── export_instructions.md.j2 # 导出格式 prompt
```

- 后缀 `.md.j2` 表示这是 Markdown 格式的 Jinja2 模板
- 不按场景分目录（所有场景共享一套章节模板）
- 如果某章节的场景差异大，在模板内用 `{% if scenario == "xxx" %}` 分支

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
